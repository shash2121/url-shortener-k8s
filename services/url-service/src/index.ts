import { config } from 'dotenv';
config();
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { shortenRoutes } from './routes/shorten';
import { redirectRoutes } from './routes/redirect';
import { manageRoutes } from './routes/manage';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

app.register(cors, { origin: true, credentials: true });
app.register(cookie);
app.register(shortenRoutes, { prefix: '' });
app.register(redirectRoutes, { prefix: '' });
app.register(manageRoutes, { prefix: '' });

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

const start = async () => {
  try {
    await app.ready();
    await app.listen({ port: parseInt(process.env.PORT || '3002', 10), host: '0.0.0.0' });
    app.log.info(`URL service running on port ${process.env.PORT || 3002}`);
  } catch (err) { app.log.error(err); process.exit(1); }
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => { await app.close(); process.exit(0); });
});

start();
