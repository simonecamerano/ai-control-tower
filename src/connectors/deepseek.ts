import { config } from '../config';
import { BaseConnector } from './base';
import { ProviderMetrics, HealthStatus } from '../types';

export class DeepSeekConnector extends BaseConnector {
  constructor() {
    super('deepseek');
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    if (!config.DEEPSEEK_API_KEY) {
      return {
        provider: 'deepseek',
        status: 'inactive',
        health: 'OK',
        models: [],
        resetAt: null,
        lastUpdatedAt: new Date().toISOString()
      };
    }

    const now = new Date().toISOString();
    const errorResult: ProviderMetrics = {
      provider: 'deepseek',
      status: 'error',
      health: 'BLOCKED',
      models: [],
      resetAt: null,
      lastUpdatedAt: now
    };

    try {
      const response = await fetch('https://api.deepseek.com/user/balance', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`
        }
      });

      if (!response.ok) {
        return errorResult;
      }

      const data = await response.json();

      if (!data.balance_infos || data.balance_infos.length === 0) {
        return errorResult;
      }

      const balanceInfo = data.balance_infos[0];
      const totalBalance = parseFloat(balanceInfo.topped_up_balance || '0') + parseFloat(balanceInfo.granted_balance || '0');
      const remainingBalance = parseFloat(balanceInfo.total_balance || '0');
      const usedBalance = Number((totalBalance - remainingBalance).toFixed(4));

      const isAvailable = data.is_available ?? (remainingBalance > 0);
      let health: HealthStatus = 'OK';
      if (!isAvailable || remainingBalance <= 0) {
        health = 'BLOCKED';
      } else if (remainingBalance < 1.0) {
        health = 'CRITICAL';
      } else if (remainingBalance < 5.0) {
        health = 'WARNING';
      }

      const quota = {
        type: 'credits' as const,
        total: totalBalance,
        used: usedBalance,
        remaining: remainingBalance
      };

      return {
        provider: 'deepseek',
        status: 'active',
        health,
        globalQuota: quota,
        models: [
          {
            modelId: 'deepseek-chat',
            modelName: 'DeepSeek Chat',
            quota,
            resetAt: null
          },
          {
            modelId: 'deepseek-coder',
            modelName: 'DeepSeek Coder',
            quota,
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
