import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'pg';
import Redis from 'ioredis';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { signAccessToken, verifyAccessToken } from '../services/jwt';

let pool: Pool | null = null;
let redis: Redis | null = null;

function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

function getRedis(): Redis {
  if (!redis) redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  return redis;
}

const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/signup', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    if (!email || !password) return reply.code(400).send({ error: 'Email and password are required' });

    const existing = await getPool().query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return reply.code(409).send({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await getPool().query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role, created_at',
      [email, passwordHash]
    );

    const user = result.rows[0];
    const token = signAccessToken(user.id, user.email, user.role);
    const refreshToken = uuidv4();
    await getRedis().setex(`refresh:${user.id}`, parseInt(REFRESH_TOKEN_EXPIRES_IN) * 86400, refreshToken);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true, secure: true, sameSite: 'strict',
      maxAge: parseInt(REFRESH_TOKEN_EXPIRES_IN) * 86400, path: '/auth/refresh',
    });

    request.log.info({ userId: user.id, email: user.email }, 'User signed up');
    return reply.code(201).send({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  fastify.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    if (!email || !password) return reply.code(400).send({ error: 'Email and password are required' });

    const result = await getPool().query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      request.log.warn({ email }, 'Login failed: user not found');
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      request.log.warn({ email }, 'Login failed: invalid password');
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = signAccessToken(user.id, user.email, user.role);
    const refreshToken = uuidv4();
    await getRedis().setex(`refresh:${user.id}`, parseInt(REFRESH_TOKEN_EXPIRES_IN) * 86400, refreshToken);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true, secure: true, sameSite: 'strict',
      maxAge: parseInt(REFRESH_TOKEN_EXPIRES_IN) * 86400, path: '/auth/refresh',
    });

    request.log.info({ userId: user.id, email: user.email }, 'User logged in');
    return reply.code(200).send({ token, user: { id: user.id, email: user.email, role: user.role } });
  });

  fastify.post('/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = (request.cookies as any)?.refreshToken;
    if (!refreshToken) {
      request.log.warn('Refresh failed: no token cookie');
      return reply.code(401).send({ error: 'Refresh token required' });
    }

    const userId = await getRedis().get(`refresh:${refreshToken}`);
    if (!userId) {
      request.log.warn('Refresh failed: invalid token');
      return reply.code(401).send({ error: 'Invalid refresh token' });
    }

    const result = await getPool().query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      request.log.warn({ userId }, 'Refresh failed: user not found');
      return reply.code(401).send({ error: 'User not found' });
    }

    const user = result.rows[0];
    const newToken = signAccessToken(user.id, user.email, user.role);
    const newRefreshToken = uuidv4();
    await getRedis().setex(`refresh:${user.id}`, parseInt(REFRESH_TOKEN_EXPIRES_IN) * 86400, newRefreshToken);

    reply.setCookie('refreshToken', newRefreshToken, {
      httpOnly: true, secure: true, sameSite: 'strict',
      maxAge: parseInt(REFRESH_TOKEN_EXPIRES_IN) * 86400, path: '/auth/refresh',
    });

    request.log.info({ userId: user.id }, 'Token refreshed');
    return reply.code(200).send({ token: newToken });
  });

  fastify.get('/auth/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      request.log.warn('Verify failed: no auth header');
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    try {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      request.log.info({ userId: payload.sub }, 'Token verified');
      return reply.code(200).send(payload);
    } catch (err) {
      request.log.warn({ err }, 'Verify failed: invalid token');
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });

  fastify.addHook('onClose', async () => {
    if (pool) await pool.end();
    if (redis) await redis.quit();
  });
}
