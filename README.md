# LinkShrink - Production URL Shortener

A production-ready URL shortener built with 4 microservices, premium dark glassmorphism UI, and full analytics.

## Architecture

```
Frontend (React + Vite + Nginx) → Auth Service (JWT) → URL Service (shorten/redirect) → Analytics Service (events) → Cleanup Worker (cron)
```

**Services:**
- **Auth Service** (port 3001) — Signup, login, JWT issuance, refresh token rotation
- **URL Service** (port 3002) — Shortening, redirects, URL management, Redis cache
- **Analytics Service** (port 3003) — Consumes visit events, exposes analytics API
- **Cleanup Worker** (port 3004) — Hourly cron for expired/deleted URL cleanup

**Infrastructure:**
- PostgreSQL — Users, URLs, visits, cleanup runs
- Redis — URL cache (24h TTL, LFU), refresh tokens, rate limiting
- RabbitMQ — Event queue for url.visited events

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Docker (Recommended)

```bash
cp .env.example .env
docker-compose up -d --build
```

The app will be available at `http://localhost`.

### Local Development

1. Start infrastructure:
```bash
docker-compose up -d postgres redis rabbitmq
```

2. Run each service in a separate terminal:
```bash
cd services/auth-service && npm install && npm run dev
cd services/url-service && npm install && npm run dev
cd services/analytics-service && npm install && npm run dev
cd services/cleanup-worker && npm install && npm run dev
cd frontend && npm install && npm run dev
```

3. Frontend runs at `http://localhost:5173`

## API Endpoints

### Auth Service
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/signup | Register new user |
| POST | /auth/login | Login with credentials |
| POST | /auth/refresh | Refresh JWT token |

### URL Service
| Method | Path | Description |
|--------|------|-------------|
| POST | /shorten | Create short URL |
| GET | /urls | List user's URLs |
| DELETE | /urls/:code | Delete a URL |
| GET | /:code | Redirect to long URL |

### Analytics Service
| Method | Path | Description |
|--------|------|-------------|
| GET | /analytics/:code | Get analytics for a URL |

### Cleanup Worker
| Method | Path | Description |
|--------|------|-------------|
| POST | /admin/cleanup | Trigger cleanup manually |
| GET | /admin/runs | View cleanup history |

## Running Tests

```bash
cd services/auth-service && npm test
cd services/url-service && npm test
cd services/analytics-service && npm test
cd services/cleanup-worker && npm test
```

## Architecture Q&A

**(a) Preventing duplicate short codes under concurrency:**
Use PostgreSQL's `UNIQUE` constraint on `short_code` column. On insert conflict (error code 23505), retry with a new code. The unique index acts as the single source of truth — no application-level locking needed. For high-throughput systems, use `INSERT ... ON CONFLICT DO NOTHING` with a retry loop, or pre-generate a pool of codes.

**(b) Redis unavailability fallback:**
The cache-aside pattern naturally handles Redis failures. On cache miss, the service falls back to PostgreSQL. If Redis is down, `getCache()` returns null and the service queries the database directly. Error handling wraps all Redis operations with try/catch so failures are logged but don't block the request path.

**(c) Scaling to 10k redirects/sec:**
- **Redis cache:** 95%+ hit rate means most redirects are served from Redis (sub-millisecond)
- **Connection pooling:** Use pgBouncer for PostgreSQL connection management
- **Horizontal scaling:** Run multiple URL service instances behind a load balancer
- **Async analytics:** Visit events are published fire-and-forget to RabbitMQ, not blocking the redirect
- **CDN:** Cache redirect responses at the edge with `Cache-Control: public, max-age=3600`
- **Stateless services:** Any instance can handle any request — no sticky sessions needed

**(d) JWT refresh flow:**
1. Client stores access token in memory (not localStorage)
2. Refresh token is stored in HttpOnly, Secure, SameSite=Strict cookie
3. On 401 from API, client calls `POST /auth/refresh` (cookie sent automatically)
4. Server validates refresh token against Redis (rotation: old token deleted, new one issued)
5. New access token returned; client retries original request
6. If refresh fails, client redirects to login
