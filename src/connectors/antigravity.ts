import { execSync } from 'child_process';
import { BaseConnector } from './base';
import { ProviderMetrics, ModelMetrics, HealthStatus } from '../types';

/** Per-model quota data returned inside the Antigravity language server response. */
interface ClientModelConfig {
  label: string;
  quotaInfo?: {
    remainingFraction?: number;
    /** Unix timestamp (seconds) or ISO string indicating when the quota resets. */
    resetTime?: string | number | null;
  };
}

/** Relevant subset of the `GetUserStatus` RPC response from the language server. */
interface AntigravityResponse {
  userStatus?: {
    cascadeModelConfigData?: {
      clientModelConfigs?: ClientModelConfig[];
    };
  };
}

/**
 * Converts a human-readable model label (e.g. "GPT-4o") to a URL-safe, lower-case
 * kebab-case identifier (e.g. "gpt-4o").
 */
function normalizeModelId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Converts a Unix timestamp (seconds) or an ISO/parseable date string to an ISO 8601
 * string. Returns `null` for `null`/`undefined` values or unparseable inputs.
 */
function toIsoString(resetTime: string | number | null | undefined): string | null {
  if (resetTime == null) return null;
  // The language server may return the reset time as a Unix epoch in seconds.
  const d = new Date(typeof resetTime === 'number' ? resetTime * 1000 : resetTime);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Scans the system process list for the Codeium/Antigravity language server and
 * extracts its PID and CSRF token from the command-line arguments.
 *
 * Falls back from `ps aux` to `ps -ef` for compatibility with different Unix flavours.
 * Returns `null` if the process is not found or the token cannot be parsed.
 */
function findLanguageServerProcess(): { pid: string; csrfToken: string } | null {
  let output: string;
  try {
    output = execSync('ps aux', { encoding: 'utf8' });
  } catch {
    try {
      output = execSync('ps -ef', { encoding: 'utf8' });
    } catch {
      return null;
    }
  }

  const lines = output.split('\n');
  const targetLine = lines.find(
    (line) =>
      (line.includes('/bin/language_server') || line.includes('language_server_linux_x64')) &&
      line.includes('antigravity')
  );

  if (!targetLine) return null;

  const columns = targetLine.trim().split(/\s+/);
  const pid = columns[1];

  // The CSRF token is passed as a CLI flag: --csrf_token=<token> or --csrf_token <token>
  const tokenMatch = targetLine.match(/--csrf_token[=\s]+([\w-]+(?:-[\w-]+)*)/);

  if (!pid || !tokenMatch) return null;

  return { pid, csrfToken: tokenMatch[1] };
}

/**
 * Uses `lsof` to discover which localhost TCP ports the language server process
 * (identified by PID) is listening on.
 *
 * Returns an array of port numbers when `lsof` is available and matching ports are found.
 * Returns an empty array if `lsof` is unavailable or no matching port is found.
 */
function findProcessPorts(pid: string): number[] {
  try {
    const output = execSync(`lsof -nP -iTCP -sTCP:LISTEN -a -p ${pid}`, { encoding: 'utf8' });
    const ports: number[] = [];
    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/127\.0\.0\.1:(\d+)/);
      if (match) {
        ports.push(parseInt(match[1], 10));
      }
    }
    return ports;
  } catch {
    return [];
  }
}

/**
 * Connector for Antigravity (Codeium's local language server).
 *
 * Rather than hitting a remote API, this connector introspects the running
 * `language_server` process: it reads its PID and CSRF token from the process
 * list, discovers the HTTP ports via `lsof`, and queries the local gRPC-Web
 * endpoint for per-model quota fractions.
 */
export class AntigravityConnector extends BaseConnector {
  constructor() {
    super('antigravity');
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    const now = new Date().toISOString();
    const errorResult: ProviderMetrics = {
      provider: 'antigravity',
      status: 'error',
      health: 'BLOCKED',
      models: [],
      resetAt: null,
      lastUpdatedAt: now,
    };

    const proc = findLanguageServerProcess();
    if (!proc) return errorResult;

    const ports = findProcessPorts(proc.pid);
    if (ports.length === 0) return errorResult;

    for (const port of ports) {
      try {
        const response = await fetch(
          `http://127.0.0.1:${port}/exa.language_server_pb.LanguageServerService/GetUserStatus`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Connect-Protocol-Version': '1',
              'x-codeium-csrf-token': proc.csrfToken,
            },
            body: JSON.stringify({
              metadata: {
                ideName: 'antigravity',
                extensionName: 'antigravity',
                ideVersion: 'unknown',
                locale: 'en',
              },
            }),
          }
        );

        if (response.ok) {
          const data = (await response.json()) as AntigravityResponse;
          const clientModelConfigs =
            data?.userStatus?.cascadeModelConfigData?.clientModelConfigs ?? [];

          // Collect raw fractions separately so we can compute the average for health scoring.
          const rawFractions: number[] = [];
          const models: ModelMetrics[] = clientModelConfigs.map((m) => {
            const label = m.label ?? 'unknown';
            const fraction =
              typeof m.quotaInfo?.remainingFraction === 'number' ? m.quotaInfo.remainingFraction : 0;
            rawFractions.push(fraction);

            return {
              modelId: normalizeModelId(label),
              modelName: label,
              quota: {
                type: 'percent',
                total: 100,
                used: Math.round((1 - fraction) * 100),
                remaining: Math.round(fraction * 100),
              },
              resetAt: toIsoString(m.quotaInfo?.resetTime),
            };
          });

          // Health is derived from the average remaining fraction across all models.
          // All-zero fractions (or no models) are treated as BLOCKED.
          let health: HealthStatus;
          if (models.length === 0 || rawFractions.every((f) => f === 0)) {
            health = 'BLOCKED';
          } else {
            const avg = rawFractions.reduce((sum, f) => sum + f, 0) / rawFractions.length;
            if (avg > 0.3) {
              health = 'OK';
            } else if (avg >= 0.1) {
              health = 'WARNING';
            } else {
              health = 'CRITICAL';
            }
          }

          // Use the soonest reset time across all models as the top-level resetAt.
          const earliestReset =
            models
              .map((m) => m.resetAt)
              .filter((r): r is string => r !== null)
              .sort()[0] ?? null;

          return {
            provider: 'antigravity',
            status: 'active',
            health,
            models,
            resetAt: earliestReset,
            lastUpdatedAt: now,
          };
        }
      } catch {
        // Try next port
      }
    }

    return errorResult;
  }
}
