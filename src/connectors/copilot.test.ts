import { expect, test, describe, vi, afterEach } from 'vitest';
import { CopilotConnector } from './copilot';
import { config } from '../config';

describe('CopilotConnector', () => {
  const originalApiKey = config.COPILOT_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    config.COPILOT_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('should return inactive status if COPILOT_API_KEY is not present', async () => {
    config.COPILOT_API_KEY = '';
    const connector = new CopilotConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('inactive');
  });

  test('should parse successful usage response correctly', async () => {
    config.COPILOT_API_KEY = 'test-key';
    const mockApiResponse = {
      premium_interactions_total: 600,
      premium_interactions_used: 150,
      premium_interactions_remaining: 450,
      subscription_reset_date: '2026-06-15T00:00:00.000Z'
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });
    global.fetch = mockFetch;

    const connector = new CopilotConnector();
    const result = await connector.fetchMetrics();

    expect(result.provider).toBe('copilot');
    expect(result.status).toBe('active');
    expect(result.health).toBe('OK');
    expect(result.models).toHaveLength(1);
    expect(result.models[0].modelId).toBe('copilot-chat');
    expect(result.models[0].quota).toEqual({
      type: 'requests',
      total: 600,
      used: 150,
      remaining: 450
    });
    expect(result.models[0].resetAt).toBe('2026-06-15T00:00:00.000Z');
  });

  test('should return error status and BLOCKED health on failed response', async () => {
    config.COPILOT_API_KEY = 'test-key';

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const connector = new CopilotConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('error');
    expect(result.health).toBe('BLOCKED');
  });
});
