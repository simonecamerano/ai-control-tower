import { config } from '../config';
import { BaseConnector } from './base';
import { ProviderMetrics, HealthStatus } from '../types';

/**
 * Connector for GitHub Copilot.
 *
 * Queries the GitHub REST API (`GET /user/copilot`) to retrieve the monthly
 * premium-interaction quota. Requires `COPILOT_API_KEY` (a GitHub personal
 * access token or OAuth token with `copilot` scope); returns `inactive` when
 * the key is absent.
 */
export class CopilotConnector extends BaseConnector {
  constructor() {
    super('copilot');
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    if (!config.COPILOT_API_KEY) {
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
      const response = await fetch('https://api.github.com/user/copilot', {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${config.COPILOT_API_KEY}`,
          'User-Agent': 'AI-Control-Tower'
        }
      });

      if (!response.ok) {
        return errorResult;
      }

      const data = await response.json();

      // Fall back to sensible defaults when the API omits quota fields
      // (e.g. unlimited plans or API schema changes).
      const total = typeof data.premium_interactions_total === 'number' ? data.premium_interactions_total : 500;
      const used = typeof data.premium_interactions_used === 'number' ? data.premium_interactions_used : 0;
      const remaining = typeof data.premium_interactions_remaining === 'number' ? data.premium_interactions_remaining : (total - used);

      const quota = {
        type: 'requests' as const,
        total,
        used,
        remaining
      };

      // Guard against division by zero for plans that report total = 0.
      const health: HealthStatus = remaining <= 0 ? 'BLOCKED' : remaining / (total || 1) < 0.1 ? 'CRITICAL' : remaining / (total || 1) < 0.3 ? 'WARNING' : 'OK';
      const resetAt = data.subscription_reset_date ? new Date(data.subscription_reset_date).toISOString() : null;

      return {
        provider: 'copilot',
        status: 'active',
        health,
        models: [
          {
            modelId: 'copilot-chat',
            modelName: 'Copilot Chat',
            quota,
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
