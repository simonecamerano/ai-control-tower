export type HealthStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'BLOCKED';

export interface MetricQuota {
  type: 'tokens' | 'requests' | 'credits' | 'percent';
  total: number;
  used: number;
  remaining: number;
}

export interface ModelMetrics {
  modelId: string;
  modelName: string;
  quota: MetricQuota;
  resetAt: string | null;
}

export interface ProviderMetrics {
  provider: string;
  status: 'active' | 'inactive' | 'error';
  health: HealthStatus;
  globalQuota?: MetricQuota;
  models: ModelMetrics[];
  resetAt: string | null;
  lastUpdatedAt: string;
}
