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
   * Finds the single best available model across all active providers.
   *
   * Selection strategy:
   * 1. Filter out providers with `CRITICAL` or `BLOCKED` health.
   * 2. Prefer `OK` over `WARNING`.
   * 3. Within the same health tier, rank by remaining-quota fraction (descending)
   *    so the model with the most headroom is recommended.
   *
   * Returns `{ recommended, fallback }` where `fallback` is the second-best choice.
   */
  fastify.get('/v1/models/best-match', async (request, reply) => {
    const providerNames = ConnectorFactory.getRegisteredProviders();
    const allMetrics: ProviderMetrics[] = [];

    for (const name of providerNames) {
      try {
        const connector = ConnectorFactory.getConnector(name);
        const metrics = await connector.fetchMetrics();
        if (metrics.status === 'active') {
          allMetrics.push(metrics);
        }
      } catch (error) {
        fastify.log.error(error, `Error fetching metrics for ${name} during best-match search`);
      }
    }

    const availableModels = allMetrics
      .filter(p => p.health === 'OK' || p.health === 'WARNING')
      .flatMap(p =>
        p.models.map(m => ({
          provider: p.provider,
          modelId: m.modelId,
          modelName: m.modelName,
          remaining: m.quota.remaining,
          total: m.quota.total,
          type: m.quota.type,
          health: p.health
        }))
      );

    const sorted = availableModels.sort((a, b) => {
      // Primary sort: OK before WARNING.
      if (a.health !== b.health) {
        return a.health === 'OK' ? -1 : 1;
      }
      // Secondary sort: higher remaining fraction first.
      const fractionA = a.remaining / (a.total || 1);
      const fractionB = b.remaining / (b.total || 1);
      return fractionB - fractionA;
    });

    const recommended = sorted[0] || null;
    const fallback = sorted[1] || null;

    return reply.send({ recommended, fallback });
  });
}
