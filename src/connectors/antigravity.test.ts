import { expect, test, describe } from 'vitest';
import { AntigravityConnector } from './antigravity';

function isValidISODate(date: string): boolean {
  return !isNaN(Date.parse(date));
}

describe('AntigravityConnector', () => {
  test('should fetch metrics with valid provider and status', async () => {
    const connector = new AntigravityConnector();
    const metrics = await connector.fetchMetrics();

    console.log('Antigravity Live Metrics:', JSON.stringify(metrics, null, 2));

    expect(metrics.provider).toBe('antigravity');
    expect(['active', 'error']).toContain(metrics.status);
    expect(['OK', 'WARNING', 'CRITICAL', 'BLOCKED']).toContain(metrics.health);
    expect(isValidISODate(metrics.lastUpdatedAt)).toBe(true);
  });
});
