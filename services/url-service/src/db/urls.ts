import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function createShortUrl(shortCode: string, longUrl: string, userId: string, expiresAt: Date | null) {
  const result = await getPool().query(
    'INSERT INTO urls (short_code, long_url, user_id, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
    [shortCode, longUrl, userId, expiresAt]
  );
  return result.rows[0];
}

export async function getUrlByCode(code: string) {
  const result = await getPool().query(
    'SELECT * FROM urls WHERE short_code = $1 AND deleted_at IS NULL', [code]
  );
  return result.rows[0] || null;
}

export async function getUserUrls(userId: string) {
  const result = await getPool().query(
    `SELECT short_code as code, long_url as "longUrl", clicks,
     expires_at as "expiresAt", created_at as "createdAt"
     FROM urls WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function deleteUrl(code: string, userId: string) {
  const result = await getPool().query(
    'UPDATE urls SET deleted_at = NOW() WHERE short_code = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id',
    [code, userId]
  );
  return result.rows.length > 0;
}

export async function incrementClicks(code: string) {
  await getPool().query('UPDATE urls SET clicks = COALESCE(clicks, 0) + 1 WHERE short_code = $1', [code]);
}
