import { expect, test, describe, vi, afterEach } from 'vitest';
import { ClaudeConnector } from './claude';
import { config } from '../config';

describe('ClaudeConnector', () => {
  const originalOrgId = config.CLAUDE_ORG_ID;
  const originalSessionCookie = config.CLAUDE_SESSION_COOKIE;
  const originalPlatformOrgId = config.CLAUDE_PLATFORM_ORG_ID;
  const originalPlatformSessionCookie = config.CLAUDE_PLATFORM_SESSION_COOKIE;
  const originalFetch = global.fetch;

  afterEach(() => {
    config.CLAUDE_ORG_ID = originalOrgId;
    config.CLAUDE_SESSION_COOKIE = originalSessionCookie;
    config.CLAUDE_PLATFORM_ORG_ID = originalPlatformOrgId;
    config.CLAUDE_PLATFORM_SESSION_COOKIE = originalPlatformSessionCookie;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('should return inactive status if CLAUDE_ORG_ID or CLAUDE_SESSION_COOKIE is not present', async () => {
    config.CLAUDE_ORG_ID = '';
    config.CLAUDE_SESSION_COOKIE = '';
    const connector = new ClaudeConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('inactive');
  });

  test('should parse successful usage response correctly (no platform org)', async () => {
    config.CLAUDE_ORG_ID = 'test-org';
    config.CLAUDE_SESSION_COOKIE = 'session-cookie';
    config.CLAUDE_PLATFORM_ORG_ID = '';

    const mockApiResponse = {
      five_hour: { utilization: 35.0, resets_at: '2026-06-01T13:40:00.449021+00:00' },
      seven_day: { utilization: 32.0, resets_at: '2026-06-03T13:00:00.449043+00:00' }
    };

    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockApiResponse });

    const connector = new ClaudeConnector();
    const result = await connector.fetchMetrics();

    expect(result.provider).toBe('claude');
    expect(result.status).toBe('active');
    expect(result.health).toBe('OK');
    expect(result.models).toHaveLength(2);

    expect(result.models[0].modelId).toBe('claude-5h-window');
    expect(result.models[0].modelName).toBe('Claude Session');
    expect(result.models[0].quota).toEqual({
      type: 'percent',
      total: 100,
      used: 35,
      remaining: 65
    });
    expect(result.models[0].resetAt).toBe('2026-06-01T13:40:00.449021+00:00');

    expect(result.models[1].modelId).toBe('claude-7d-window');
    expect(result.models[1].modelName).toBe('Claude Weekly');
    expect(result.models[1].quota).toEqual({
      type: 'percent',
      total: 100,
      used: 32,
      remaining: 68
    });
    expect(result.models[1].resetAt).toBe('2026-06-03T13:00:00.449043+00:00');
  });

  test('should include API Balance model when CLAUDE_PLATFORM_ORG_ID is set', async () => {
    config.CLAUDE_ORG_ID = 'test-org';
    config.CLAUDE_SESSION_COOKIE = 'session-cookie';
    config.CLAUDE_PLATFORM_ORG_ID = 'platform-org';
    config.CLAUDE_PLATFORM_SESSION_COOKIE = 'platform-session';

    const usageResponse = {
      five_hour: { utilization: 35.0, resets_at: '2026-06-01T13:40:00.449021+00:00' },
      seven_day: { utilization: 32.0, resets_at: '2026-06-03T13:00:00.449043+00:00' }
    };
    const creditsResponse = { amount: 481, currency: 'USD' };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => usageResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => creditsResponse });

    const connector = new ClaudeConnector();
    const result = await connector.fetchMetrics();

    expect(result.models).toHaveLength(3);
    const balance = result.models.find(m => m.modelId === 'claude-api-balance');
    expect(balance?.modelName).toBe('API Balance');
    expect(balance?.quota.type).toBe('currency');
    expect(balance?.quota.remaining).toBeCloseTo(4.81);
  });

  test('should return error status and BLOCKED health on failed response', async () => {
    config.CLAUDE_ORG_ID = 'test-org';
    config.CLAUDE_SESSION_COOKIE = 'session-cookie';

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const connector = new ClaudeConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('error');
    expect(result.health).toBe('BLOCKED');
  });
});
