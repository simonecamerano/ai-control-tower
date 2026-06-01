import { expect, test, describe, vi, afterEach } from 'vitest';
import { TavilyConnector } from './tavily';
import { config } from '../config';

describe('TavilyConnector', () => {
  const originalApiKey = config.TAVILY_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    config.TAVILY_API_KEY = originalApiKey;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('should return inactive status if TAVILY_API_KEY is not present', async () => {
    config.TAVILY_API_KEY = '';
    const connector = new TavilyConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('inactive');
  });

  test('should parse successful usage response correctly', async () => {
    config.TAVILY_API_KEY = 'test-key';
    const mockApiResponse = {
      key: {
        usage: 250,
        limit: 1000
      }
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });
    global.fetch = mockFetch;

    const connector = new TavilyConnector();
    const result = await connector.fetchMetrics();

    expect(result.provider).toBe('tavily');
    expect(result.status).toBe('active');
    expect(result.health).toBe('OK');
    expect(result.models).toHaveLength(1);
    expect(result.models[0].modelId).toBe('tavily-search');
    expect(result.models[0].quota).toEqual({
      type: 'requests',
      total: 1000,
      used: 250,
      remaining: 750
    });
  });

  test('should return error status and BLOCKED health on failed response', async () => {
    config.TAVILY_API_KEY = 'test-key';

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const connector = new TavilyConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('error');
    expect(result.health).toBe('BLOCKED');
  });
});
