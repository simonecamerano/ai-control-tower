import { config } from '../config';
import { BaseConnector } from './base';
import { ProviderMetrics, HealthStatus } from '../types';

/**
 * Connector for Tavily Search.
 *
 * Queries the Tavily usage API (`GET /usage`) to retrieve the monthly search
 * request quota. Requires `TAVILY_API_KEY`; returns `inactive` when the key is
 * absent.
 */
export class TavilyConnector extends BaseConnector {
  constructor() {
    super('tavily');
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    if (!config.TAVILY_API_KEY) {
      return {
        provider: 'tavily',
        status: 'inactive',
        health: 'OK',
        models: [],
        resetAt: null,
        lastUpdatedAt: new Date().toISOString()
      };
    }

    const now = new Date().toISOString();
    const errorResult: ProviderMetrics = {
      provider: 'tavily',
      status: 'error',
      health: 'BLOCKED',
      models: [],
      resetAt: null,
      lastUpdatedAt: now
    };

    try {
      const response = await fetch('https://api.tavily.com/usage', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${config.TAVILY_API_KEY}`
        }
      });

      if (!response.ok) {
        return errorResult;
      }

      const data = await response.json();

      // The Tavily API may nest quota info under `data.key` (API-key scope) or
      // `data.account` (account scope) depending on the plan and endpoint version.
      let usage = 0;
      let limit = 0;

      if (data.key && typeof data.key.usage === 'number' && typeof data.key.limit === 'number') {
        usage = data.key.usage;
        limit = data.key.limit;
      } else if (data.account && typeof data.account.usage === 'number' && typeof data.account.limit === 'number') {
        usage = data.account.usage;
        limit = data.account.limit;
      } else {
        return errorResult;
      }

      const remaining = limit - usage;
      let health: HealthStatus = 'OK';
      if (remaining <= 0) {
        health = 'BLOCKED';
      } else if (remaining / (limit || 1) < 0.1) {
        health = 'CRITICAL';
      } else if (remaining / (limit || 1) < 0.3) {
        health = 'WARNING';
      }

      return {
        provider: 'tavily',
        status: 'active',
        health,
        models: [
          {
            modelId: 'tavily-search',
            modelName: 'Tavily Search',
            quota: { type: 'requests', total: limit, used: usage, remaining },
            resetAt: null
          }
        ],
        resetAt: null,
        lastUpdatedAt: now
      };
    } catch {
      return errorResult;
    }
  }
}
