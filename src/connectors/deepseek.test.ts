import { expect, test, describe, vi, afterEach } from 'vitest';
import { DeepSeekConnector } from './deepseek';
import { config } from '../config';

describe('DeepSeekConnector', () => {
  const originalApiKey = config.DEEPSEEK_API_KEY;
  const originalPlatformToken = config.DEEPSEEK_PLATFORM_TOKEN;
  const originalFetch = global.fetch;

  afterEach(() => {
    config.DEEPSEEK_API_KEY = originalApiKey;
    config.DEEPSEEK_PLATFORM_TOKEN = originalPlatformToken;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('should return inactive status if DEEPSEEK_API_KEY is not present', async () => {
    config.DEEPSEEK_API_KEY = '';
    const connector = new DeepSeekConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('inactive');
  });

  test('should show Balance model from balance API only (no platform token)', async () => {
    config.DEEPSEEK_API_KEY = 'test-key';
    config.DEEPSEEK_PLATFORM_TOKEN = '';
    const balanceResponse = {
      is_available: true,
      balance_infos: [{ currency: 'USD', total_balance: '8.50', granted_balance: '1.50', topped_up_balance: '7.00' }]
    };

    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => balanceResponse });

    const connector = new DeepSeekConnector();
    const result = await connector.fetchMetrics();

    expect(result.status).toBe('active');
    expect(result.health).toBe('OK');
    expect(result.models).toHaveLength(1);
    expect(result.models[0].modelId).toBe('deepseek-balance');
    expect(result.models[0].modelName).toBe('Balance');
    expect(result.models[0].quota).toEqual({ type: 'credits', total: 8.5, used: 0, remaining: 8.5 });
  });

  test('should show Balance + Monthly Spend when platform token is set', async () => {
    config.DEEPSEEK_API_KEY = 'test-key';
    config.DEEPSEEK_PLATFORM_TOKEN = 'platform-token';
    const balanceResponse = {
      is_available: true,
      balance_infos: [{ currency: 'USD', total_balance: '1.41', granted_balance: '0.00', topped_up_balance: '1.41' }]
    };
    const costResponse = {
      data: { biz_data: [{ total: [
        { model: 'deepseek-v4-flash', usage: [
          { type: 'PROMPT_CACHE_HIT_TOKEN', amount: '0.0000978432' },
          { type: 'PROMPT_CACHE_MISS_TOKEN', amount: '0.0007758800' },
          { type: 'RESPONSE_TOKEN', amount: '0.0036321600' }
        ]}
      ]}]}
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => balanceResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => costResponse });

    const connector = new DeepSeekConnector();
    const result = await connector.fetchMetrics();

    expect(result.models).toHaveLength(2);
    expect(result.models[0].modelId).toBe('deepseek-balance');
    expect(result.models[1].modelId).toBe('deepseek-monthly');
    expect(result.models[1].modelName).toBe('Monthly Spend');
    expect(result.models[1].quota.used).toBeCloseTo(0.004506, 4);
  });

  test('should return error on network failure', async () => {
    config.DEEPSEEK_API_KEY = 'test-key';
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const connector = new DeepSeekConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('error');
    expect(result.health).toBe('BLOCKED');
  });
});
