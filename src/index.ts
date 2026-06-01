import Fastify from 'fastify';
import { config } from './config';
import { initializeConnectors } from './connectors';
import { providersRoutes } from './routes/providers';

initializeConnectors();

const server = Fastify({ logger: true });

server.get('/health', async () => {
  return { status: 'ok' };
});

server.register(providersRoutes);

const port = config.PORT;

const start = async () => {
  try {
    await server.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
