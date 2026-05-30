import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function deleteExpiredUrls(): Promise<number> {
  const result = await getPool().query(
    'DELETE FROM urls WHERE expires_at IS NOT NULL AND expires_at < NOW() RETURNING id'
  );
  return result.rowCount || 0;
}

export async function deleteSoftDeletedUrls(): Promise<number> {
  const result = await getPool().query(
    'DELETE FROM urls WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL \'30 days\' RETURNING id'
  );
  return result.rowCount || 0;
}

export async function recordCleanupRun(deletedCount: number, durationMs: number) {
  await getPool().query(
    'INSERT INTO cleanup_runs (deleted_count, duration_ms) VALUES ($1, $2)', [deletedCount, durationMs]
  );
}

export async function getCleanupRuns() {
  const result = await getPool().query(
    'SELECT run_at as "runAt", deleted_count as "deletedCount", duration_ms as "durationMs" FROM cleanup_runs ORDER BY run_at DESC LIMIT 50'
  );
  return result.rows;
}

export async function getLastRun() {
  const result = await getPool().query(
    'SELECT run_at as "runAt", deleted_count as "deletedCount", duration_ms as "durationMs" FROM cleanup_runs ORDER BY run_at DESC LIMIT 1'
  );
  return result.rows[0] || null;
}
