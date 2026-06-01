import { ProviderMetrics } from '../types';

/**
 * Abstract base class for all AI provider connectors.
 *
 * Implements an in-memory TTL cache in front of the provider-specific
 * `fetchMetricsRaw` implementation so that rapid successive calls to
 * `fetchMetrics` do not hammer the upstream API.
 */
export abstract class BaseConnector {
  private providerName: string;
  private cachedMetrics: ProviderMetrics | null = null;
  private cacheTtlMs: number;

  /**
   * @param providerName - Unique identifier for this provider (e.g. `"claude"`).
   * @param cacheTtlMs   - How long cached metrics remain valid in milliseconds.
   *                       Defaults to 15 seconds.
   */
  constructor(providerName: string, cacheTtlMs: number = 15000) {
    this.providerName = providerName;
    this.cacheTtlMs = cacheTtlMs;
  }

  /** Returns the provider identifier this connector was constructed with. */
  public getProviderName(): string {
    return this.providerName;
  }

  /**
   * Returns cached metrics if they are still within the TTL window; otherwise
   * fetches fresh metrics via `fetchMetricsRaw`, stores them, and returns them.
   */
  public async fetchMetrics(): Promise<ProviderMetrics> {
    const now = Date.now();
    // Compare wall-clock time against the ISO timestamp embedded in the cached result.
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

  /** Invalidates the in-memory cache, forcing the next `fetchMetrics` call to hit the API. */
  public clearCache(): void {
    this.cachedMetrics = null;
  }

  /**
   * Fetches live metrics directly from the upstream provider API.
   * Subclasses must implement this method; caching is handled by `fetchMetrics`.
   */
  protected abstract fetchMetricsRaw(): Promise<ProviderMetrics>;
}
