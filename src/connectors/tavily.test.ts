import { expect, test, describe, vi, afterEach } from 'vitest';
import { TavilyConnector } from './tavily';
import { config } from '../config';

describe('TavilyConnector', () => {
  const originalApiKey = config.TAVILY_API_KEY;
  const originalSessionCookie = config.TAVILY_SESSION_COOKIE;
  const originalFetch = global.fetch;

  afterEach(() => {
    config.TAVILY_API_KEY = originalApiKey;
    config.TAVILY_SESSION_COOKIE = originalSessionCookie;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('should return inactive when neither API key nor session cookie is set', async () => {
    config.TAVILY_API_KEY = '';
    config.TAVILY_SESSION_COOKIE = '';
    const connector = new TavilyConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('inactive');
  });

  test('should use session cookie and call app.tavily.com/api/account when cookie is set', async () => {
    config.TAVILY_SESSION_COOKIE = 'test-session';
    config.TAVILY_API_KEY = '';
    const mockApiResponse = {
      usage: 10, limit: 1000, last_reset: '2026-06-01T01:00:55.705Z',
      current_plan: 'researcher', plan_display_name: 'Researcher'
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });
    global.fetch = mockFetch;

    const connector = new TavilyConnector();
    const result = await connector.fetchMetrics();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://app.tavily.com/api/account',
      expect.objectContaining({ headers: expect.objectContaining({ Cookie: 'appSession=test-session' }) })
    );
    expect(result.status).toBe('active');
    expect(result.models[0].quota).toEqual({ type: 'requests', total: 1000, used: 10, remaining: 990 });
    expect(result.models[0].resetAt).toBe('2026-06-01T01:00:55.705Z');
  });

  test('should fall back to API key when session cookie is not set', async () => {
    config.TAVILY_SESSION_COOKIE = '';
    config.TAVILY_API_KEY = 'test-key';
    const mockApiResponse = { key: { usage: 250, limit: 1000 } };

    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockApiResponse });
    global.fetch = mockFetch;

    const connector = new TavilyConnector();
    const result = await connector.fetchMetrics();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.tavily.com/usage',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) })
    );
    expect(result.status).toBe('active');
    expect(result.models[0].quota).toEqual({ type: 'requests', total: 1000, used: 250, remaining: 750 });
  });

  test('should fall back to account plan_limit when key.limit is null', async () => {
    config.TAVILY_SESSION_COOKIE = '';
    config.TAVILY_API_KEY = 'test-key';
    const mockApiResponse = {
      key: { usage: 10, limit: null, search_usage: 10 },
      account: { current_plan: 'Researcher', plan_usage: 10, plan_limit: 1000 }
    };

    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockApiResponse });

    const connector = new TavilyConnector();
    const result = await connector.fetchMetrics();

    expect(result.status).toBe('active');
    expect(result.models[0].quota).toEqual({ type: 'requests', total: 1000, used: 10, remaining: 990 });
  });

  test('should return error on network failure', async () => {
    config.TAVILY_API_KEY = 'test-key';
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const connector = new TavilyConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('error');
    expect(result.health).toBe('BLOCKED');
  });
});
