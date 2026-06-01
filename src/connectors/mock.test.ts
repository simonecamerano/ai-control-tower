import { expect, test, describe } from 'vitest';
import { MockConnector } from './mock';

describe('MockConnector', () => {
  test('fetchMetrics() returns the correct provider name', async () => {
    const connector = new MockConnector('claude');
    const metrics = await connector.fetchMetrics();
    expect(metrics.provider).toBe('claude');
  });

  test('health status is one of: OK, WARNING, CRITICAL, BLOCKED', async () => {
    const connector = new MockConnector('claude');
    const metrics = await connector.fetchMetrics();
    expect(['OK', 'WARNING', 'CRITICAL', 'BLOCKED']).toContain(metrics.health);
  });

  test('successfully generates metrics for known mock providers', async () => {
    const knownProviders = ['claude', 'deepseek', 'copilot', 'tavily', 'codex'];
    for (const provider of knownProviders) {
      const connector = new MockConnector(provider);
      const metrics = await connector.fetchMetrics();
      expect(metrics.provider).toBe(provider);
      expect(metrics.status).toBe('active');
    }
  });

  test('default mock is returned for unknown provider names', async () => {
    const connector = new MockConnector('unknown');
    const metrics = await connector.fetchMetrics();
    expect(metrics.provider).toBe('unknown');
    expect(metrics.status).toBe('inactive');
  });
});
