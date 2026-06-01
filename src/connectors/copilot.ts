import { config } from '../config';
import { BaseConnector } from './base';
import { ProviderMetrics, HealthStatus } from '../types';

export class CopilotConnector extends BaseConnector {
  constructor() {
    super('copilot');
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    if (!config.COPILOT_SESSION_COOKIE) {
      return {
        provider: 'copilot',
        status: 'inactive',
        health: 'OK',
        models: [],
        resetAt: null,
        lastUpdatedAt: new Date().toISOString()
      };
    }

    const now = new Date().toISOString();
    const errorResult: ProviderMetrics = {
      provider: 'copilot',
      status: 'error',
      health: 'BLOCKED',
      models: [],
      resetAt: null,
      lastUpdatedAt: now
    };

    try {
      const response = await fetch('https://github.com/github-copilot/chat/entitlement', {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'github-verified-fetch': 'true',
          'x-requested-with': 'XMLHttpRequest',
          Cookie: config.COPILOT_SESSION_COOKIE
        }
      });

      if (!response.ok) {
        return errorResult;
      }

      const data = await response.json();

      if (!data.quotas || typeof data.quotas !== 'object') {
        return errorResult;
      }

      const total: number = typeof data.quotas.limits?.premiumInteractions === 'number'
        ? data.quotas.limits.premiumInteractions
        : 300;
      const remaining: number = typeof data.quotas.remaining?.premiumInteractions === 'number'
        ? data.quotas.remaining.premiumInteractions
        : total;
      const used = Math.max(0, total - remaining);
      const resetAt: string | null = typeof data.quotas.resetDateUtc === 'string'
        ? data.quotas.resetDateUtc
        : null;

      const health: HealthStatus =
        remaining <= 0 ? 'BLOCKED'
        : remaining / (total || 1) < 0.1 ? 'CRITICAL'
        : remaining / (total || 1) < 0.3 ? 'WARNING'
        : 'OK';

      return {
        provider: 'copilot',
        status: 'active',
        health,
        models: [
          {
            modelId: 'copilot-premium-interactions',
            modelName: 'Copilot Premium Interactions',
            quota: {
              type: 'requests',
              total,
              used,
              remaining
            },
            resetAt
          }
        ],
        resetAt,
        lastUpdatedAt: now
      };
    } catch {
      return errorResult;
    }
  }
}
