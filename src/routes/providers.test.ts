import { expect, test, describe, beforeAll } from 'vitest';
import Fastify from 'fastify';
import { initializeConnectors } from '../connectors';
import { providersRoutes } from './providers';

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
    const response = await server.inject({
      method: 'GET',
      url: '/v1/providers/claude'
    });
    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.provider).toBe('claude');
    expect(data.status).toBe('active');
    expect(data.models).toHaveLength(2);
  });

  test('GET /v1/providers/non-existent returns HTTP 404', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/providers/non-existent'
    });
    expect(response.statusCode).toBe(404);
  });

  test('GET /v1/models/best-match returns HTTP 200 with recommended and fallback models', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/models/best-match'
    });
    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data).toHaveProperty('recommended');
    expect(data).toHaveProperty('fallback');
    if (data.recommended) {
      expect(data.recommended).toHaveProperty('modelId');
      expect(data.recommended).toHaveProperty('provider');
    }
  });
});
