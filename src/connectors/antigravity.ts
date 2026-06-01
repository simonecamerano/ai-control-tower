import { execSync } from 'child_process';
import { BaseConnector } from './base';
import { ProviderMetrics, ModelMetrics, HealthStatus } from '../types';

interface AntigravityModel {
  modelId?: string;
  modelName?: string;
  remainingFraction: number;
  resetTime?: string | number | null;
}

interface AntigravityResponse {
  models?: AntigravityModel[];
}

function normalizeModelId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function toIsoString(resetTime: string | number | null | undefined): string | null {
  if (resetTime == null) return null;
  const d = new Date(typeof resetTime === 'number' ? resetTime * 1000 : resetTime);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function findLanguageServerProcess(): { port: number; csrfToken: string } | null {
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
    (line) => line.includes('/bin/language_server') || line.includes('language_server_linux_x64')
  );

  if (!targetLine) return null;

  const portMatch = targetLine.match(/--extension_server_port[=\s]+(\d+)/);
  const tokenMatch = targetLine.match(
    /--csrf_token[=\s]+([\w-]+(?:-[\w-]+)*)/
  );

  if (!portMatch || !tokenMatch) return null;

  return {
    port: parseInt(portMatch[1], 10),
    csrfToken: tokenMatch[1],
  };
}

export class AntigravityConnector extends BaseConnector {
  constructor() {
    super('antigravity');
  }

  public async fetchMetrics(): Promise<ProviderMetrics> {
    const now = new Date().toISOString();
    const errorResult: ProviderMetrics = {
      provider: 'antigravity',
      status: 'error',
      health: 'BLOCKED',
      models: [],
      resetAt: null,
      lastUpdatedAt: now,
    };

    const process = findLanguageServerProcess();
    if (!process) {
      console.log('AntigravityConnector: process not found');
      return errorResult;
    }
    console.log('AntigravityConnector: found process:', process);

    let data: AntigravityResponse;
    try {
      const response = await fetch(
        `http://127.0.0.1:${process.port}/exa.language_server_pb.LanguageServerService/GetUserStatus`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Csrf-Token': process.csrfToken,
          },
          body: '{}',
        }
      );
      data = (await response.json()) as AntigravityResponse;
    } catch (err) {
      console.log('AntigravityConnector: fetch failed:', err);
      return errorResult;
    }

    const rawModels: AntigravityModel[] = data.models ?? [];

    const models: ModelMetrics[] = rawModels.map((m) => {
      const originalName = m.modelName ?? m.modelId ?? 'unknown';
      const fraction = typeof m.remainingFraction === 'number' ? m.remainingFraction : 0;
      const used = Math.round((1 - fraction) * 100);
      const remaining = Math.round(fraction * 100);

      return {
        modelId: normalizeModelId(originalName),
        modelName: originalName,
        quota: {
          type: 'percent',
          total: 100,
          used,
          remaining,
        },
        resetAt: toIsoString(m.resetTime),
      };
    });

    let health: HealthStatus;
    if (models.length === 0) {
      health = 'BLOCKED';
    } else {
      const avgFraction =
        rawModels.reduce((sum, m) => sum + (m.remainingFraction ?? 0), 0) / rawModels.length;

      if (rawModels.every((m) => (m.remainingFraction ?? 0) === 0)) {
        health = 'BLOCKED';
      } else if (avgFraction > 0.3) {
        health = 'OK';
      } else if (avgFraction >= 0.1) {
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
