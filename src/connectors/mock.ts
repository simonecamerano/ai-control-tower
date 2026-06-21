import { BaseConnector } from './base';
import { ProviderMetrics, HealthStatus } from '../types';

export class MockConnector extends BaseConnector {
  constructor(provider: string) {
    super(provider);
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    const provider = this.getProviderName();
    const currentTimestamp = new Date().toISOString();
    let metrics: ProviderMetrics;

    switch (provider) {
      case 'claude': {
        const total = 100;
        const used = Math.floor(Math.random() * 40) + 40; // 40-79%
        const remaining = total - used;
        const health: HealthStatus = used > 80 ? 'CRITICAL' : used > 60 ? 'WARNING' : 'OK';
        
        metrics = {
          provider,
          status: 'active',
          health,
          models: [
            { modelId: 'claude-3-5-sonnet', modelName: 'Claude 3.5 Sonnet', quota: { type: 'percent', total, used, remaining }, resetAt: null },
            { modelId: 'claude-3-opus', modelName: 'Claude 3 Opus', quota: { type: 'percent', total: 100, used: 80, remaining: 20 }, resetAt: null }
          ],
          resetAt: null,
          lastUpdatedAt: currentTimestamp
        };
        break;
      }
      case 'deepseek': {
        const globalTotal = 15;
        const globalUsed = Number((Math.random() * 5 + 5).toFixed(2)); // 5-9.99
        const globalRemaining = Number((globalTotal - globalUsed).toFixed(2));
        const health: HealthStatus = globalRemaining < 3 ? 'CRITICAL' : globalRemaining < 6 ? 'WARNING' : 'OK';

        metrics = {
          provider,
          status: 'active',
          health,
          globalQuota: { type: 'credits', total: globalTotal, used: globalUsed, remaining: globalRemaining },
          models: [
            { modelId: 'deepseek-chat', modelName: 'DeepSeek Chat', quota: { type: 'tokens', total: 1000000, used: 450000, remaining: 550000 }, resetAt: null }
          ],
          resetAt: null,
          lastUpdatedAt: currentTimestamp
        };
        break;
      }
      case 'tavily': {
        const total = 1000;
        const used = Math.floor(Math.random() * 100) + 150; // 150-249
        const remaining = total - used;

        metrics = {
          provider,
          status: 'active',
          health: 'OK',
          models: [
            { modelId: 'tavily-search', modelName: 'Tavily Search', quota: { type: 'requests', total, used, remaining }, resetAt: null }
          ],
          resetAt: null,
          lastUpdatedAt: currentTimestamp
        };
        break;
      }
      case 'codex': {
        const total = 100;
        const used = Math.floor(Math.random() * 5) + 93; // 93-97
        const remaining = total - used;

        metrics = {
          provider,
          status: 'active',
          health: 'CRITICAL',
          models: [
            { modelId: 'codex-model', modelName: 'Codex GPT-4o', quota: { type: 'percent', total, used, remaining }, resetAt: null }
          ],
          resetAt: null,
          lastUpdatedAt: currentTimestamp
        };
        break;
      }
      default:
        metrics = {
          provider,
          status: 'inactive',
          health: 'OK',
          models: [],
          resetAt: null,
          lastUpdatedAt: currentTimestamp
        };
    }

    return metrics;
  }
}
