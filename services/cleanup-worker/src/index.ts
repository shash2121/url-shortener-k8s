import { config } from 'dotenv';
config();
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runCleanup } from './jobs/expireUrls';
import { adminRoutes } from './routes/admin';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

app.register(cors, { origin: true });
app.register(adminRoutes);
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

const start = async () => {
  try {
    await app.ready();
    await app.listen({ port: parseInt(process.env.PORT || '3004', 10), host: '0.0.0.0' });
    app.log.info(`Cleanup worker running on port ${process.env.PORT || 3004}`);
    setInterval(async () => {
      app.log.info({ job: 'cleanup' }, 'Running scheduled cleanup');
      try {
        const result = await runCleanup();
        app.log.info({ job: 'cleanup', ...result }, 'Scheduled cleanup completed');
      } catch (err) {
        app.log.error({ err, job: 'cleanup' }, 'Scheduled cleanup failed');
      }
    }, 3600000);
  } catch (err) { app.log.error(err); process.exit(1); }
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => { await app.close(); process.exit(0); });
});

start();
