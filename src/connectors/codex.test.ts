import { expect, test, describe, vi, afterEach, beforeEach } from 'vitest';
import * as fs from 'fs';
import { CodexConnector } from './codex';
import { config } from '../config';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn()
  };
});

describe('CodexConnector', () => {
  const originalFetch = global.fetch;
  const originalSessionToken = config.CODEX_SESSION_TOKEN;
  const originalOrgId = config.CODEX_ORG_ID;

  beforeEach(() => {
    config.CODEX_SESSION_TOKEN = '';
    config.CODEX_ORG_ID = '';
  });

  afterEach(() => {
    config.CODEX_SESSION_TOKEN = originalSessionToken;
    config.CODEX_ORG_ID = originalOrgId;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('should return inactive if auth.json does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const connector = new CodexConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('inactive');
    expect(result.health).toBe('OK');
  });

  test('should return inactive if auth.json is missing access token', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{"tokens": {}}');
    const connector = new CodexConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('inactive');
  });

  test('should fetch and parse wham/usage response successfully', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ tokens: { access_token: 'test-token', account_id: 'test-acc' } })
    );

    const mockResponse = {
      rate_limit: {
        allowed: true,
        limit_reached: false,
        primary_window: {
          used_percent: 50,
          limit_window_seconds: 18000,
          reset_after_seconds: 16000,
          reset_at: 1780000000
        },
        secondary_window: {
          used_percent: 20,
          limit_window_seconds: 604800,
          reset_after_seconds: 600000,
          reset_at: 1780500000
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const connector = new CodexConnector();
    const result = await connector.fetchMetrics();

    expect(result.provider).toBe('codex');
    expect(result.status).toBe('active');
    expect(result.health).toBe('OK');
    expect(result.models).toHaveLength(2);
    expect(result.models[0].modelId).toBe('codex-primary');
    expect(result.models[0].quota.used).toBe(50);
    expect(result.models[0].quota.remaining).toBe(50);
    expect(result.models[0].resetAt).toBe(new Date(1780000000 * 1000).toISOString());
    expect(result.models[1].modelId).toBe('codex-secondary');
    expect(result.models[1].quota.used).toBe(20);
    expect(result.models[1].quota.remaining).toBe(80);
    expect(result.models[1].resetAt).toBe(new Date(1780500000 * 1000).toISOString());
    expect(result.resetAt).toBe(new Date(1780000000 * 1000).toISOString());
  });

  test('should return critical health if used_percent >= 90', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ tokens: { access_token: 'test-token' } })
    );

    const mockResponse = {
      rate_limit: {
        allowed: true,
        limit_reached: false,
        primary_window: {
          used_percent: 92,
          limit_window_seconds: 18000,
          reset_after_seconds: 16000,
          reset_at: 1780000000
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const connector = new CodexConnector();
    const result = await connector.fetchMetrics();
    expect(result.health).toBe('CRITICAL');
  });

  test('should return warning health if used_percent >= 70', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ tokens: { access_token: 'test-token' } })
    );

    const mockResponse = {
      rate_limit: {
        allowed: true,
        limit_reached: false,
        primary_window: {
          used_percent: 75,
          limit_window_seconds: 18000,
          reset_after_seconds: 16000,
          reset_at: 1780000000
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const connector = new CodexConnector();
    const result = await connector.fetchMetrics();
    expect(result.health).toBe('WARNING');
  });

  test('should return blocked health if limit_reached is true', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ tokens: { access_token: 'test-token' } })
    );

    const mockResponse = {
      rate_limit: {
        allowed: true,
        limit_reached: true,
        primary_window: {
          used_percent: 10,
          limit_window_seconds: 18000,
          reset_after_seconds: 16000,
          reset_at: 1780000000
        }
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const connector = new CodexConnector();
    const result = await connector.fetchMetrics();
    expect(result.health).toBe('BLOCKED');
  });

  test('should return error status and BLOCKED health if fetch fails', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ tokens: { access_token: 'test-token' } })
    );

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const connector = new CodexConnector();
    const result = await connector.fetchMetrics();
    expect(result.status).toBe('error');
    expect(result.health).toBe('BLOCKED');
  });
});
