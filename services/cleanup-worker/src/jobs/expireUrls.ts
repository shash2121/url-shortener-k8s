import { deleteExpiredUrls, deleteSoftDeletedUrls, recordCleanupRun } from '../db/cleanup';

import pino from 'pino';

const log = pino({ level: process.env.LOG_LEVEL || 'info', name: 'cleanup-worker' });

export async function runCleanup() {
  const start = Date.now();

  const expiredCount = await deleteExpiredUrls();
  const softDeletedCount = await deleteSoftDeletedUrls();
  const totalDeleted = expiredCount + softDeletedCount;

  const duration = Date.now() - start;
  await recordCleanupRun(totalDeleted, duration);

  log.info({ expiredCount, softDeletedCount, totalDeleted, durationMs: duration }, 'Cleanup run completed');
  return { deletedCount: totalDeleted, durationMs: duration };
}
