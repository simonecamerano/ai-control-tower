import { expect, test, describe, vi, afterEach } from 'vitest';
import { CopilotConnector } from './copilot';
import { config } from '../config';

describe('CopilotConnector', () => {
  const originalSessionCookie = config.COPILOT_SESSION_COOKIE;
  const originalFetch = global.fetch;

  afterEach(() => {
    config.COPILOT_SESSION_COOKIE = originalSessionCookie;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('should return inactive status if COPILOT_SESSION_COOKIE is not present', async () => {
    config.COPILOT_SESSION_COOKIE = '';
    const connector = new CopilotConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('inactive');
  });

  test('should parse successful usage response correctly', async () => {
    config.COPILOT_SESSION_COOKIE = 'session=test-session-cookie';
    const mockApiResponse = {
      licenseType: 'licensed_full',
      quotas: {
        limits: { premiumInteractions: 300 },
        remaining: { premiumInteractions: 150, chatPercentage: 50.0, premiumInteractionsPercentage: 50.0 },
        resetDate: '2026-07-01',
        resetDateUtc: '2026-07-01T00:00:00.000Z',
        overagesEnabled: false
      },
      plan: 'pro'
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
    expect(result.models[0].modelId).toBe('copilot-premium-interactions');
    expect(result.models[0].quota).toEqual({
      type: 'requests',
      total: 300,
      used: 150,
      remaining: 150
    });
    expect(result.models[0].resetAt).toBe('2026-07-01T00:00:00.000Z');
  });

  test('should return error status and BLOCKED health on failed response', async () => {
    config.COPILOT_SESSION_COOKIE = 'session=test-session-cookie';

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const connector = new CopilotConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('error');
    expect(result.health).toBe('BLOCKED');
  });
});
