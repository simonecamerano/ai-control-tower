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
      const [balanceRes, costRes] = await Promise.all([
        fetch('https://api.deepseek.com/user/balance', {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`
          }
        }),
        config.DEEPSEEK_PLATFORM_TOKEN
          ? fetch(`https://platform.deepseek.com/api/v0/usage/cost?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`, {
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${config.DEEPSEEK_PLATFORM_TOKEN}`,
                'x-app-version': '1.0.0'
              }
            })
          : Promise.resolve(null)
      ]);

      if (!balanceRes.ok) return errorResult;

      const balanceData = await balanceRes.json();
      if (!balanceData.balance_infos?.length) return errorResult;

      const info = balanceData.balance_infos[0];
      const toppedUp = parseFloat(info.topped_up_balance || '0');
      const granted = parseFloat(info.granted_balance || '0');
      const totalBalance = toppedUp + granted;
      const remaining = parseFloat(info.total_balance || '0');
      const usedBalance = Number((totalBalance - remaining).toFixed(4));

      const isAvailable = balanceData.is_available ?? (remaining > 0);
      let health: HealthStatus = 'OK';
      if (!isAvailable || remaining <= 0) health = 'BLOCKED';
      else if (remaining < 0.20) health = 'CRITICAL';
      else if (remaining < 0.50) health = 'WARNING';

      // Monthly spend: sum all amounts from the platform cost endpoint.
      let monthlySpend = 0;
      if (costRes?.ok) {
        const costData = await costRes.json();
        const totals: { usage: { amount: string }[] }[] = costData?.data?.biz_data?.[0]?.total ?? [];
        for (const model of totals) {
          for (const entry of model.usage ?? []) {
            monthlySpend += parseFloat(entry.amount || '0');
          }
        }
        monthlySpend = Number(monthlySpend.toFixed(6));
      }

      const models = [
        {
          modelId: 'deepseek-balance',
          modelName: 'Balance',
          quota: { type: 'currency' as const, total: 0, used: usedBalance, remaining },
          resetAt: null
        },
        ...(config.DEEPSEEK_PLATFORM_TOKEN ? [{
          modelId: 'deepseek-monthly',
          modelName: 'Monthly Spend',
          quota: { type: 'currency' as const, total: 0, used: monthlySpend, remaining: monthlySpend },
          resetAt: null
        }] : [])
      ];

      return {
        provider: 'deepseek',
        status: 'active',
        health,
        models,
        resetAt: null,
        lastUpdatedAt: now
      };
    } catch {
      return errorResult;
    }
  }
}
