import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function recordVisit(shortCode: string, visitedAt: string, referrer: string, userAgent: string) {
  await getPool().query(
    'INSERT INTO visits (short_code, visited_at, country, referrer, user_agent) VALUES ($1, $2, $3, $4, $5)',
    [shortCode, visitedAt, 'US', referrer, userAgent]
  );
}

export async function getTotalClicks(code: string): Promise<number> {
  const result = await getPool().query('SELECT COUNT(*) FROM visits WHERE short_code = $1', [code]);
  return parseInt(result.rows[0].count, 10);
}

export async function getTodayClicks(code: string): Promise<number> {
  const result = await getPool().query(
    'SELECT COUNT(*) FROM visits WHERE short_code = $1 AND visited_at >= NOW() - INTERVAL \'24 hours\'', [code]
  );
  return parseInt(result.rows[0].count, 10);
}

export async function getClicksByDay(code: string) {
  const result = await getPool().query(
    `SELECT DATE(visited_at) as day, COUNT(*) as clicks
     FROM visits WHERE short_code = $1 GROUP BY DATE(visited_at) ORDER BY day ASC`, [code]
  );
  return result.rows;
}

export async function getTopReferrers(code: string) {
  const result = await getPool().query(
    `SELECT referrer, COUNT(*) as count FROM visits WHERE short_code = $1 AND referrer != ''
     GROUP BY referrer ORDER BY count DESC LIMIT 10`, [code]
  );
  return result.rows;
}

export async function getTopCountries(code: string) {
  const result = await getPool().query(
    `SELECT country, COUNT(*) as count FROM visits WHERE short_code = $1 AND country IS NOT NULL
     GROUP BY country ORDER BY count DESC LIMIT 10`, [code]
  );
  return result.rows;
}
