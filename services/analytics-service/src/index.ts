import { config } from 'dotenv';
config();
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { startConsumer } from './consumers/visitConsumer';
import { analyticsRoutes } from './routes/analytics';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

app.register(cors, { origin: true });
app.register(analyticsRoutes);
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

const start = async () => {
  try {
    await app.ready();
    await startConsumer(app.log);
    await app.listen({ port: parseInt(process.env.PORT || '3003', 10), host: '0.0.0.0' });
    app.log.info(`Analytics service running on port ${process.env.PORT || 3003}`);
  } catch (err) { app.log.error(err); process.exit(1); }
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => { await app.close(); process.exit(0); });
});

start();
