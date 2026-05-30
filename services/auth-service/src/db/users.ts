import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function createUser(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role, created_at',
    [email, passwordHash]
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string) {
  const result = await pool.query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

export async function findUserById(id: string) {
  const result = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}
