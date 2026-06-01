import { execSync } from 'child_process';
import { BaseConnector } from './base';
import { ProviderMetrics, ModelMetrics, HealthStatus } from '../types';

interface ClientModelConfig {
  label: string;
  quotaInfo?: {
    remainingFraction?: number;
    resetTime?: string | number | null;
  };
}

interface AntigravityResponse {
  userStatus?: {
    cascadeModelConfigData?: {
      clientModelConfigs?: ClientModelConfig[];
    };
  };
}

function normalizeModelId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function toIsoString(resetTime: string | number | null | undefined): string | null {
  if (resetTime == null) return null;
  const d = new Date(typeof resetTime === 'number' ? resetTime * 1000 : resetTime);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

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

  const tokenMatch = targetLine.match(/--csrf_token[=\s]+([\w-]+(?:-[\w-]+)*)/);

  if (!pid || !tokenMatch) return null;

  return { pid, csrfToken: tokenMatch[1] };
}

function findProcessPort(pid: string): number | null {
  try {
    const output = execSync(`lsof -nP -iTCP -sTCP:LISTEN -a -p ${pid}`, { encoding: 'utf8' });
    const match = output.match(/127\.0\.0\.1:(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

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

    const port = findProcessPort(proc.pid);
    if (!port) return errorResult;

    let data: AntigravityResponse;
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
      data = (await response.json()) as AntigravityResponse;
    } catch {
      return errorResult;
    }

    const clientModelConfigs =
      data?.userStatus?.cascadeModelConfigData?.clientModelConfigs ?? [];

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
}
