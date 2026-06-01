import { expect, test, describe, beforeAll, vi } from 'vitest';
import Fastify from 'fastify';
import { initializeConnectors } from '../connectors';
import { ConnectorFactory } from '../connectors/factory';
import { providersRoutes } from './providers';
import { config } from '../config';

const server = Fastify();

beforeAll(async () => {
  initializeConnectors();
  await server.register(providersRoutes);
});

describe('API Providers Routes', () => {
  test('GET /v1/providers returns HTTP 200 and a JSON map with valid HealthStatus', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/providers'
    });
    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data).toHaveProperty('claude');
    expect(['OK', 'WARNING', 'CRITICAL', 'BLOCKED']).toContain(data.claude);
  });

  test('GET /v1/status returns HTTP 200 and a JSON map with valid HealthStatus', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/status'
    });
    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data).toHaveProperty('claude');
    expect(['OK', 'WARNING', 'CRITICAL', 'BLOCKED']).toContain(data.claude);
  });

  test('GET /v1/providers/claude returns HTTP 200 and full mock metrics', async () => {
    config.CLAUDE_ORG_ID = 'test-org';
    config.CLAUDE_SESSION_COOKIE = 'session-cookie';

    // Clear cache to bypass any previous inactive cached responses
    ConnectorFactory.getConnector('claude').clearCache();

    const mockApiResponse = {
      five_hour_usage_fraction: 0.3,
      seven_day_usage_fraction: 0.1,
      reset_at: '2026-06-01T15:00:00.000Z'
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse
    });
    const originalFetch = global.fetch;
    global.fetch = mockFetch;

    try {
      const response = await server.inject({
        method: 'GET',
        url: '/v1/providers/claude'
      });
      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.provider).toBe('claude');
      expect(data.status).toBe('active');
      expect(data.models).toHaveLength(2);
    } finally {
      global.fetch = originalFetch;
      config.CLAUDE_ORG_ID = '';
      config.CLAUDE_SESSION_COOKIE = '';
    }
  });

  test('GET /v1/providers/non-existent returns HTTP 404', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/providers/non-existent'
    });
    expect(response.statusCode).toBe(404);
  });

  test('GET /v1/models/best-match returns HTTP 200 with first and second low-quota models', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/models/best-match'
    });
    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data).toHaveProperty('first');
    expect(data).toHaveProperty('second');
    if (data.first) {
      expect(data.first).toHaveProperty('modelId');
      expect(data.first).toHaveProperty('provider');
    }
  });
});
