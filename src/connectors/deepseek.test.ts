import { expect, test, describe, vi, afterEach } from 'vitest';
import { DeepSeekConnector } from './deepseek';
import { config } from '../config';

describe('DeepSeekConnector', () => {
  const originalApiKey = config.DEEPSEEK_API_KEY;

  afterEach(() => {
    config.DEEPSEEK_API_KEY = originalApiKey;
    vi.restoreAllMocks();
  });

  test('should return inactive status if DEEPSEEK_API_KEY is not present', async () => {
    config.DEEPSEEK_API_KEY = '';
    const connector = new DeepSeekConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('inactive');
  });

  test('should parse successful balance response correctly', async () => {
    config.DEEPSEEK_API_KEY = 'test-key';
    const mockApiResponse = {
      is_available: true,
      balance_infos: [
        {
          currency: 'USD',
          total_balance: '8.50',
          granted_balance: '1.50',
          topped_up_balance: '7.00'
        }
      ]
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });
    global.fetch = mockFetch;

    const connector = new DeepSeekConnector();
    const result = await connector.fetchMetrics();

    expect(result.provider).toBe('deepseek');
    expect(result.status).toBe('active');
    expect(result.health).toBe('OK');
    expect(result.globalQuota).toEqual({
      type: 'credits',
      total: 8.5,
      used: 0, // topped_up + granted = 7 + 1.5 = 8.5. remaining = 8.5. used = 8.5 - 8.5 = 0.
      remaining: 8.5
    });
    expect(result.models).toHaveLength(2);
    expect(result.models[0].modelId).toBe('deepseek-chat');
  });

  test('should return error status and BLOCKED health on failed response', async () => {
    config.DEEPSEEK_API_KEY = 'test-key';

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const connector = new DeepSeekConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('error');
    expect(result.health).toBe('BLOCKED');
  });
});
