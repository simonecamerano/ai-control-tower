import { BaseConnector } from './base';
import { ProviderMetrics, HealthStatus, ModelMetrics } from '../types';
import { config } from '../config';

interface AnthropicUsagePeriod {
  utilization?: unknown;
  resets_at?: unknown;
}

interface AnthropicUsageResponse {
  five_hour?: AnthropicUsagePeriod;
  seven_day?: AnthropicUsagePeriod;
  [key: string]: unknown;
}

/**
 * Connector for Anthropic Claude (console usage API).
 *
 * Queries the undocumented Anthropic console REST endpoint using a session
 * cookie. Requires `CLAUDE_ORG_ID` and `CLAUDE_SESSION_COOKIE` to be set;
 * returns `inactive` status when either is absent.
 */
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
        `https://claude.ai/api/organizations/${config.CLAUDE_ORG_ID}/usage`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Cookie: config.CLAUDE_SESSION_COOKIE,
            // Mimic a browser UA to avoid bot-rejection from the console CDN.
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

      const sonnetUsed = typeof data.five_hour?.utilization === 'number' ? Math.round(data.five_hour.utilization) : 0;
      const opusUsed = typeof data.seven_day?.utilization === 'number' ? Math.round(data.seven_day.utilization) : 0;
      const sonnetRemaining = Math.max(0, 100 - sonnetUsed);
      const opusRemaining = Math.max(0, 100 - opusUsed);
      const resetAt = typeof data.five_hour?.resets_at === 'string' ? data.five_hour.resets_at : null;

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

      // Health is driven by the worst-case model: if any model is near its limit the
      // whole provider is flagged accordingly.
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
