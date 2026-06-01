import { FastifyInstance } from 'fastify';
import { ConnectorFactory } from '../connectors/factory';
import { ProviderMetrics, HealthStatus } from '../types';

export async function providersRoutes(fastify: FastifyInstance) {
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
  fastify.get('/v1/status', getProvidersHandler);

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
      if (a.health !== b.health) {
        return a.health === 'OK' ? -1 : 1;
      }
      const fractionA = a.remaining / (a.total || 1);
      const fractionB = b.remaining / (b.total || 1);
      return fractionB - fractionA;
    });

    const recommended = sorted[0] || null;
    const fallback = sorted[1] || null;

    return reply.send({ recommended, fallback });
  });
}
