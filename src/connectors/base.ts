import { ProviderMetrics } from '../types';

export abstract class BaseConnector {
  private providerName: string;
  private cachedMetrics: ProviderMetrics | null = null;
  private cacheTtlMs: number;

  constructor(providerName: string, cacheTtlMs: number = 15000) {
    this.providerName = providerName;
    this.cacheTtlMs = cacheTtlMs;
  }

  public getProviderName(): string {
    return this.providerName;
  }

  public async fetchMetrics(): Promise<ProviderMetrics> {
    const now = Date.now();
    if (
      this.cachedMetrics &&
      now - new Date(this.cachedMetrics.lastUpdatedAt).getTime() < this.cacheTtlMs
    ) {
      return this.cachedMetrics;
    }

    const freshMetrics = await this.fetchMetricsRaw();
    this.cachedMetrics = freshMetrics;
    return freshMetrics;
  }

  public clearCache(): void {
    this.cachedMetrics = null;
  }

  protected abstract fetchMetricsRaw(): Promise<ProviderMetrics>;
}
