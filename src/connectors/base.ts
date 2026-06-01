import { ProviderMetrics } from '../types';

export abstract class BaseConnector {
  private providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  public getProviderName(): string {
    return this.providerName;
  }

  public abstract fetchMetrics(): Promise<ProviderMetrics>;
}
