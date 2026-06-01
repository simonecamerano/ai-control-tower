import { FastifyInstance } from 'fastify';
import { ConnectorFactory } from '../connectors/factory';
import { ProviderMetrics, HealthStatus } from '../types';

/**
 * Registers all provider-related API routes on the given Fastify instance.
 *
 * Exposed endpoints:
 * - `GET /v1/providers`        — summary health map for all registered providers.
 * - `GET /v1/status`           — alias for `/v1/providers`.
 * - `GET /v1/providers/:name`  — full `ProviderMetrics` for a single provider.
 * - `GET /v1/models/best-match`— recommended and fallback model across active providers.
 *
 * @param fastify - The Fastify instance to attach routes to.
 */
export async function providersRoutes(fastify: FastifyInstance) {
  /**
   * Iterates all registered providers and returns a `{ providerName: HealthStatus }`
   * map. Providers that throw during metric fetching are reported as `"BLOCKED"`.
   */
  const getProvidersHandler = async (request: any, reply: any) => {
    const providerNames = ConnectorFactory.getRegisteredProviders();
    const metricsMap: { [providerName: string]: HealthStatus } = {};

    for (const name of providerNames) {
      try {
        const connector = ConnectorFactory.getConnector(name);
        const metrics = await connector.fetchMetrics();
        metricsMap[name] = metrics.health;
      } catch (error) {
        fastify.log.error(error, `Error fetching metrics for ${name}`);
        metricsMap[name] = 'BLOCKED';
      }
    }

    return reply.send(metricsMap);
  };

  fastify.get('/v1/providers', getProvidersHandler);
  // /v1/status is an intentional alias so clients can poll a generic health URL.
  fastify.get('/v1/status', getProvidersHandler);

  /** Returns full `ProviderMetrics` for a single provider, or 404 if unknown. */
  fastify.get('/v1/providers/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    try {
      const connector = ConnectorFactory.getConnector(name);
      const metrics = await connector.fetchMetrics();
      return reply.send(metrics);
    } catch (error) {
      fastify.log.error(error, `Error fetching metrics for provider: ${name}`);
      return reply.code(404).send({ error: 'Provider not found or configuration error' });
    }
  });

  /**
   * Returns the two coding-assistant models closest to exhaustion.
   *
   * Selection strategy:
   * 1. Exclude non-coding providers (e.g. tavily search tool).
   * 2. Include only active providers that are not BLOCKED.
   * 3. Sort ascending by remaining-quota fraction so the most depleted model is first.
   *
   * Returns `{ first, second }` — the two models with the least quota left.
   */
  fastify.get('/v1/models/best-match', async (request, reply) => {
    const NON_CODING_PROVIDERS = new Set(['tavily']);
    const providerNames = ConnectorFactory.getRegisteredProviders()
      .filter(n => !NON_CODING_PROVIDERS.has(n));
    const allMetrics: ProviderMetrics[] = [];

    for (const name of providerNames) {
      try {
        const connector = ConnectorFactory.getConnector(name);
        const metrics = await connector.fetchMetrics();
        if (metrics.status === 'active') {
          allMetrics.push(metrics);
        }
      } catch (error) {
        fastify.log.error(error, `Error fetching metrics for ${name} during low-quota search`);
      }
    }

    const candidateModels = allMetrics
      .filter(p => p.health !== 'BLOCKED')
      .flatMap(p =>
        p.models
          .filter(m => {
            if (m.quota.type !== 'currency') return true;
            // currency models only appear when balance is low, and never for informational-only entries
            const isAlertable = m.modelId === 'deepseek-balance';
            return isAlertable && (p.health === 'WARNING' || p.health === 'CRITICAL');
          })
          .map(m => ({
          provider: p.provider,
          modelId: m.modelId,
          modelName: m.modelName,
          remaining: m.quota.remaining,
          total: m.quota.total,
          type: m.quota.type,
          health: p.health,
          resetAt: m.resetAt ?? p.resetAt ?? null
        }))
      );

    // Ascending by remaining fraction: most depleted first.
    const sorted = candidateModels.sort((a, b) => {
      const fractionA = a.remaining / (a.total || 1);
      const fractionB = b.remaining / (b.total || 1);
      return fractionA - fractionB;
    });

    return reply.send({ first: sorted[0] || null, second: sorted[1] || null });
  });
}
