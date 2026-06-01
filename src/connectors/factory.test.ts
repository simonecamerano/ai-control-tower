import { expect, test, describe } from 'vitest';
import { ConnectorFactory } from './factory';
import { BaseConnector } from './base';
import { ProviderMetrics } from '../types';

class TestConnector extends BaseConnector {
  constructor() {
    super('test-provider');
  }

  protected async fetchMetricsRaw(): Promise<ProviderMetrics> {
    return {
      provider: 'test-provider',
      status: 'active',
      health: 'OK',
      models: [],
      resetAt: null,
      lastUpdatedAt: new Date().toISOString()
    };
  }
}

describe('ConnectorFactory', () => {
  test('Registering and retrieving a connector works', () => {
    const connector = new TestConnector();
    ConnectorFactory.register('test-provider', connector);
    
    expect(ConnectorFactory.getRegisteredProviders()).toContain('test-provider');
    expect(ConnectorFactory.getConnector('test-provider')).toBe(connector);
  });

  test('Getting an unregistered provider throws an error', () => {
    expect(() => ConnectorFactory.getConnector('unregistered-provider')).toThrow(
      'Provider unregistered-provider not registered'
    );
  });
});
