import { expect, test, describe } from 'vitest';
import { BaseConnector } from './base';
import { ProviderMetrics } from '../types';

class TestCacheConnector extends BaseConnector {
  public rawCalls = 0;

  constructor(ttl: number) {
    super('test-cache', ttl);
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    this.rawCalls++;
    return {
      provider: 'test-cache',
      status: 'active',
      health: 'OK',
      models: [],
      resetAt: null,
      lastUpdatedAt: new Date().toISOString()
    };
  }
}

describe('BaseConnector Caching', () => {
  test('should return cached metrics within TTL and fetch fresh metrics after TTL', async () => {
    const ttl = 100; // 100ms TTL for testing
    const connector = new TestCacheConnector(ttl);

    // First fetch - calls raw fetch
    const metrics1 = await connector.fetchMetrics();
    expect(connector.rawCalls).toBe(1);

    // Second fetch (immediate) - should be cached
    const metrics2 = await connector.fetchMetrics();
    expect(connector.rawCalls).toBe(1);
    expect(metrics1.lastUpdatedAt).toBe(metrics2.lastUpdatedAt);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, ttl + 10));

    // Third fetch - cache expired, should call raw fetch again
    const metrics3 = await connector.fetchMetrics();
    expect(connector.rawCalls).toBe(2);
    expect(metrics3.lastUpdatedAt).not.toBe(metrics1.lastUpdatedAt);
  });
});
