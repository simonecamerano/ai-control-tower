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

interface AnthropicCreditsResponse {
  amount?: unknown;
  currency?: unknown;
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

    const headers = {
      Accept: 'application/json',
      Cookie: config.CLAUDE_SESSION_COOKIE,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    try {
      const [usageRes, creditsRes] = await Promise.all([
        fetch(`https://claude.ai/api/organizations/${config.CLAUDE_ORG_ID}/usage`, { headers }),
        config.CLAUDE_PLATFORM_ORG_ID && config.CLAUDE_PLATFORM_SESSION_COOKIE
          ? fetch(`https://platform.claude.com/api/organizations/${config.CLAUDE_PLATFORM_ORG_ID}/prepaid/credits`, {
              headers: {
                Accept: 'application/json',
                Cookie: config.CLAUDE_PLATFORM_SESSION_COOKIE,
                'anthropic-client-platform': 'web_console',
                'content-type': 'application/json',
                'User-Agent': headers['User-Agent']
              }
            })
          : Promise.resolve(null)
      ]);

      if (!usageRes.ok) {
        return { provider: 'claude', status: 'error', health: 'BLOCKED', models: [], resetAt: null, lastUpdatedAt: new Date().toISOString() };
      }

      const data = (await usageRes.json()) as AnthropicUsageResponse;

      const sonnetUsed = typeof data.five_hour?.utilization === 'number' ? Math.round(data.five_hour.utilization) : 0;
      const opusUsed = typeof data.seven_day?.utilization === 'number' ? Math.round(data.seven_day.utilization) : 0;
      const sonnetRemaining = Math.max(0, 100 - sonnetUsed);
      const opusRemaining = Math.max(0, 100 - opusUsed);
      const fiveHourResetAt = typeof data.five_hour?.resets_at === 'string' ? data.five_hour.resets_at : null;
      const sevenDayResetAt = typeof data.seven_day?.resets_at === 'string' ? data.seven_day.resets_at : null;

      const models: ModelMetrics[] = [
        {
          modelId: 'claude-5h-window',
          modelName: 'Claude Session',
          quota: { type: 'percent', total: 100, used: sonnetUsed, remaining: sonnetRemaining },
          resetAt: fiveHourResetAt
        },
        {
          modelId: 'claude-7d-window',
          modelName: 'Claude Weekly',
          quota: { type: 'percent', total: 100, used: opusUsed, remaining: opusRemaining },
          resetAt: sevenDayResetAt
        }
      ];

      // API prepaid balance (platform.claude.com) — amount is in cents
      if (creditsRes?.ok) {
        const creditsData = (await creditsRes.json()) as AnthropicCreditsResponse;
        if (typeof creditsData.amount === 'number') {
          const balanceDollars = creditsData.amount / 100;
          models.push({
            modelId: 'claude-api-balance',
            modelName: 'API Balance',
            quota: { type: 'currency', total: 0, used: 0, remaining: balanceDollars },
            resetAt: null
          });
        }
      }

      const maxUsed = Math.max(sonnetUsed, opusUsed);
      const health: HealthStatus = maxUsed >= 90 ? 'CRITICAL' : maxUsed >= 70 ? 'WARNING' : 'OK';

      return {
        provider: 'claude',
        status: 'active',
        health,
        models,
        resetAt: fiveHourResetAt,
        lastUpdatedAt: new Date().toISOString()
      };
    } catch {
      return { provider: 'claude', status: 'error', health: 'BLOCKED', models: [], resetAt: null, lastUpdatedAt: new Date().toISOString() };
    }
  }
}
