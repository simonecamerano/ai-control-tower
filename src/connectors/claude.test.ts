import { expect, test, describe, vi, afterEach } from 'vitest';
import { ClaudeConnector } from './claude';
import { config } from '../config';

describe('ClaudeConnector', () => {
  const originalOrgId = config.CLAUDE_ORG_ID;
  const originalSessionCookie = config.CLAUDE_SESSION_COOKIE;
  const originalFetch = global.fetch;

  afterEach(() => {
    config.CLAUDE_ORG_ID = originalOrgId;
    config.CLAUDE_SESSION_COOKIE = originalSessionCookie;
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

  test('should parse successful usage response correctly', async () => {
    config.CLAUDE_ORG_ID = 'test-org';
    config.CLAUDE_SESSION_COOKIE = 'session-cookie';

    const mockApiResponse = {
      five_hour_usage_fraction: 0.3,
      seven_day_usage_fraction: 0.1,
      reset_at: '2026-06-01T15:00:00.000Z'
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });
    global.fetch = mockFetch;

    const connector = new ClaudeConnector();
    const result = await connector.fetchMetrics();

    expect(result.provider).toBe('claude');
    expect(result.status).toBe('active');
    expect(result.health).toBe('OK');
    expect(result.models).toHaveLength(2);

    expect(result.models[0].modelId).toBe('claude-3-5-sonnet');
    expect(result.models[0].quota).toEqual({
      type: 'percent',
      total: 100,
      used: 30,
      remaining: 70
    });
    expect(result.models[0].resetAt).toBe('2026-06-01T15:00:00.000Z');

    expect(result.models[1].modelId).toBe('claude-3-opus');
    expect(result.models[1].quota).toEqual({
      type: 'percent',
      total: 100,
      used: 10,
      remaining: 90
    });
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
