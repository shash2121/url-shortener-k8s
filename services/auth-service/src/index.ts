import { config } from 'dotenv';
config();
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { authRoutes } from './routes/auth';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

app.register(cors, { origin: true, credentials: true });
app.register(cookie);

app.register(authRoutes);

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

const start = async () => {
  try {
    await app.ready();
    await app.listen({ port: parseInt(process.env.PORT || '3001', 10), host: '0.0.0.0' });
    app.log.info(`Auth service running on port ${process.env.PORT || 3001}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => {
    app.log.info(`Shutting down auth service on ${signal}`);
    await app.close();
    process.exit(0);
  });
});

start();
