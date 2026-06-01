import { config } from '../config';
import { BaseConnector } from './base';
import { ProviderMetrics, HealthStatus } from '../types';

export class TavilyConnector extends BaseConnector {
  constructor() {
    super('tavily');
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    const hasCookie = !!config.TAVILY_SESSION_COOKIE;
    const hasApiKey = !!config.TAVILY_API_KEY;

    if (!hasCookie && !hasApiKey) {
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
      return hasCookie
        ? await this.fetchViaCookie(now, errorResult)
        : await this.fetchViaApiKey(now, errorResult);
    } catch {
      return errorResult;
    }
  }

  private async fetchViaCookie(now: string, errorResult: ProviderMetrics): Promise<ProviderMetrics> {
    const response = await fetch('https://app.tavily.com/api/account', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': `appSession=${config.TAVILY_SESSION_COOKIE}`
      }
    });

    if (!response.ok) {
      return errorResult;
    }

    const data = await response.json();
    return this.parseAndBuild(data, now, errorResult);
  }

  private async fetchViaApiKey(now: string, errorResult: ProviderMetrics): Promise<ProviderMetrics> {
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
    return this.parseAndBuild(data, now, errorResult);
  }

  private parseAndBuild(data: Record<string, unknown>, now: string, errorResult: ProviderMetrics): ProviderMetrics {
    let usage = 0;
    let limit = 0;
    let resetAt: string | null = null;

    // app.tavily.com/api/account: { usage, limit, last_reset }
    if (typeof data.usage === 'number' && typeof data.limit === 'number') {
      usage = data.usage;
      limit = data.limit;
      resetAt = typeof data.last_reset === 'string' ? data.last_reset : null;
    // api.tavily.com/usage nested structure
    } else if (data.key && typeof (data.key as Record<string, unknown>).usage === 'number') {
      const k = data.key as Record<string, unknown>;
      const acc = data.account as Record<string, unknown> | undefined;
      usage = k.usage as number;
      limit = typeof k.limit === 'number'
        ? k.limit
        : (acc && typeof acc.plan_limit === 'number' ? acc.plan_limit : 0);
      resetAt = acc && typeof acc.reset_at === 'string' ? acc.reset_at : null;
    } else if (data.account) {
      const acc = data.account as Record<string, unknown>;
      if (typeof acc.plan_usage === 'number' && typeof acc.plan_limit === 'number') {
        usage = acc.plan_usage;
        limit = acc.plan_limit;
        resetAt = typeof acc.reset_at === 'string' ? acc.reset_at : null;
      } else {
        return errorResult;
      }
    } else {
      return errorResult;
    }

    const remaining = limit - usage;
    const health: HealthStatus =
      remaining <= 0 ? 'BLOCKED'
      : remaining / (limit || 1) < 0.1 ? 'CRITICAL'
      : remaining / (limit || 1) < 0.3 ? 'WARNING'
      : 'OK';

    return {
      provider: 'tavily',
      status: 'active',
      health,
      models: [
        {
          modelId: 'tavily-search',
          modelName: 'Tavily Search',
          quota: { type: 'requests', total: limit, used: usage, remaining },
          resetAt
        }
      ],
      resetAt,
      lastUpdatedAt: now
    };
  }
}
