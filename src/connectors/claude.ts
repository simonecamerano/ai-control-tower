import { BaseConnector } from './base';
import { ProviderMetrics, HealthStatus, ModelMetrics } from '../types';
import { config } from '../config';

interface AnthropicUsageResponse {
  five_hour_usage_fraction?: unknown;
  seven_day_usage_fraction?: unknown;
  reset_at?: unknown;
  used?: unknown;
  limit?: unknown;
  remaining?: unknown;
  [key: string]: unknown;
}

export class ClaudeConnector extends BaseConnector {
  constructor() {
    super('claude');
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    if (!config.CLAUDE_ORG_ID || !config.CLAUDE_SESSION_COOKIE) {
      return {
        provider: 'claude',
        status: 'inactive',
        health: 'OK',
        models: [],
        resetAt: null,
        lastUpdatedAt: new Date().toISOString()
      };
    }

    try {
      const response = await fetch(
        `https://console.anthropic.com/api/organizations/${config.CLAUDE_ORG_ID}/usage`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Cookie: config.CLAUDE_SESSION_COOKIE,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      );

      if (!response.ok) {
        return {
          provider: 'claude',
          status: 'error',
          health: 'BLOCKED',
          models: [],
          resetAt: null,
          lastUpdatedAt: new Date().toISOString()
        };
      }

      const data = (await response.json()) as AnthropicUsageResponse;

      const fiveHourFraction =
        typeof data.five_hour_usage_fraction === 'number' ? data.five_hour_usage_fraction : 0;
      const sevenDayFraction =
        typeof data.seven_day_usage_fraction === 'number' ? data.seven_day_usage_fraction : 0;
      const resetAt = typeof data.reset_at === 'string' ? data.reset_at : null;

      const sonnetUsed = Math.round(fiveHourFraction * 100);
      const sonnetRemaining = Math.round((1 - fiveHourFraction) * 100);
      const opusUsed = Math.round(sevenDayFraction * 100);
      const opusRemaining = Math.round((1 - sevenDayFraction) * 100);

      const models: ModelMetrics[] = [
        {
          modelId: 'claude-3-5-sonnet',
          modelName: 'Claude 3.5 Sonnet',
          quota: { type: 'percent', total: 100, used: sonnetUsed, remaining: sonnetRemaining },
          resetAt
        },
        {
          modelId: 'claude-3-opus',
          modelName: 'Claude 3 Opus',
          quota: { type: 'percent', total: 100, used: opusUsed, remaining: opusRemaining },
          resetAt
        }
      ];

      const maxUsed = Math.max(sonnetUsed, opusUsed);
      const health: HealthStatus = maxUsed >= 90 ? 'CRITICAL' : maxUsed >= 70 ? 'WARNING' : 'OK';

      return {
        provider: 'claude',
        status: 'active',
        health,
        models,
        resetAt,
        lastUpdatedAt: new Date().toISOString()
      };
    } catch {
      return {
        provider: 'claude',
        status: 'error',
        health: 'BLOCKED',
        models: [],
        resetAt: null,
        lastUpdatedAt: new Date().toISOString()
      };
    }
  }
}
