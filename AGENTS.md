You are a senior full-stack software architect. Build a production-ready URL Shortener using exactly 4 microservices (no API gateway). Each service has its own Dockerfile and a dedicated UI page. The frontend uses a premium dark glassmorphism design. Users must log in to manage their links.

---
SERVICES — EXACTLY 4
---

Consolidate all logic into these four services. No API gateway — the frontend calls each service directly via its exposed port (or through Nginx upstream blocks in the frontend container).

1. AUTH SERVICE
Handles all user identity: signup, login, JWT issuance, refresh token rotation. Owns the users table and manages refresh tokens in Redis.

2. URL SERVICE
Handles shortening, redirecting, and URL management in a single service. Accepts POST /shorten, resolves GET /:code (redirect), lists a user's URLs, and deletes them. Uses Redis as a cache-aside for redirect lookups and publishes url.visited events to the queue after each redirect (fire-and-forget).

3. ANALYTICS SERVICE
Consumes url.visited events from the queue, records visit data, and exposes GET /analytics/:code for the frontend. Owns the visits table.

4. CLEANUP WORKER
A scheduled cron (runs every hour) that hard-deletes expired or soft-deleted URLs from PostgreSQL and evicts them from Redis. Also exposes POST /admin/cleanup for manual triggers and GET /admin/runs for viewing run history.

---
MONOREPO FOLDER STRUCTURE
---

Output this exact structure as the very first thing before writing any code:

url-shortener/
├── docker-compose.yml
├── .env.example
├── README.md
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css          # glass design tokens + global styles
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── components/
│   │   │   ├── GlassCard.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   └── AdminPage.tsx
│   │   └── api/
│   │       ├── auth.ts
│   │       ├── urls.ts
│   │       └── analytics.ts
│   └── public/
│
├── services/
│   ├── auth-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   │   └── auth.ts
│   │   │   ├── services/
│   │   │   │   └── jwt.ts
│   │   │   └── db/
│   │   │       └── users.ts
│   │   └── .env.example
│   │
│   ├── url-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   │   ├── shorten.ts
│   │   │   │   ├── redirect.ts
│   │   │   │   └── manage.ts
│   │   │   ├── services/
│   │   │   │   ├── base62.ts
│   │   │   │   └── cache.ts
│   │   │   └── db/
│   │   │       └── urls.ts
│   │   └── .env.example
│   │
│   ├── analytics-service/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── consumers/
│   │   │   │   └── visitConsumer.ts
│   │   │   ├── routes/
│   │   │   │   └── analytics.ts
│   │   │   └── db/
│   │   │       └── visits.ts
│   │   └── .env.example
│   │
│   └── cleanup-worker/
│       ├── Dockerfile
│       ├── package.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── jobs/
│       │   │   └── expireUrls.ts
│       │   ├── routes/
│       │   │   └── admin.ts
│       │   └── db/
│       │       └── cleanup.ts
│       └── .env.example
│
└── infra/
    └── postgres/
        └── init.sql

---
FRONTEND — GLASSY UI DESIGN SYSTEM
---

The frontend is a React + TypeScript SPA (Vite + Tailwind CSS). The entire app uses a dark glassmorphism design. Build it with these exact rules — do not use plain white cards or light backgrounds anywhere.

GLOBAL CANVAS
- Full-screen dark background: deep navy-to-indigo gradient (from-[#0a0a1a] via-[#0d1030] to-[#0a0a1a])
- 2–3 large slow-moving blurred radial orbs (purple, indigo, teal) as ambient glow behind all content
- Orbs are pointer-events-none, animated with a gentle @keyframes float pulse

GLASS CARD COMPONENT — <GlassCard>
- background: rgba(255,255,255,0.05)
- backdrop-filter: blur(20px) saturate(180%)
- border: 1px solid rgba(255,255,255,0.12)
- border-radius: 16px
- Inner highlight on top edge: box-shadow: inset 0 1px 0 rgba(255,255,255,0.1)
- All data cards, form containers, and panels use this component

TYPOGRAPHY
- Primary text: #fff
- Secondary: rgba(255,255,255,0.6)
- Muted: rgba(255,255,255,0.35)
- Headings: weight 600, tracking-tight
- Labels/metadata: 12–13px, muted

INPUTS & BUTTONS
- Inputs: bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/30 backdrop-blur-sm
- Primary button: indigo-to-purple gradient, white text, rounded-xl, hover brightens, active:scale-95
- Ghost button: border border-white/15 text-white/70 hover:bg-white/8 rounded-xl
- Danger button: border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl

DATA TABLES
- Rows: border-b border-white/5, hover: bg-white/4
- Column headers: text-white/40 text-xs uppercase tracking-widest
- Short code pill: font-mono bg-white/8 border border-white/10 text-indigo-300 px-2 py-0.5 rounded-md text-sm

STAT CARDS
- Use <GlassCard> with colored icon glyph (indigo, teal, or purple) top-left
- Large number: white, 24px, weight 600
- Muted label below

CHARTS (recharts)
- Chart backgrounds: transparent
- Grid lines: stroke="rgba(255,255,255,0.06)"
- Axis labels: fill="rgba(255,255,255,0.4)"
- Line/bar colors: indigo (#818cf8) primary, teal (#2dd4bf) secondary
- Tooltip: glass style — dark bg + blur + white text

LOADING STATES
- Pulsing skeleton: bg-white/5 animate-pulse rounded-xl

TOASTS
- Floating glass pill at top-center: bg-white/10 backdrop-blur border border-white/15 text-white rounded-full px-4 py-2

PAGES TO BUILD

Login & Signup — /login, /signup
- Centered glass card on full-screen canvas
- App logo/wordmark at top
- Email + password fields (glass inputs)
- Gradient submit button
- Toggle link between login and signup
- JWT in memory via AuthContext; refresh token in HttpOnly cookie

Dashboard — /dashboard
- Calls URL Service
- Top glass card: shorten form (URL input, optional alias, optional expiry)
- Below: glass table of user's URLs (short code pill, truncated destination, clicks, expiry, delete button, copy icon)
- Empty state: centered illustration + prompt

Analytics — /analytics/:code
- Calls Analytics Service
- 4 stat cards: total clicks, today, top country, top referrer
- AreaChart (recharts) for clicks over time
- Two columns: top referrers table + country breakdown table

Admin — /admin
- Calls Cleanup Worker
- Stats: last run time, URLs deleted in last run, total runs
- Manual trigger button
- Scrollable glass table of recent cleanup run logs

---
INFRASTRUCTURE
---

QUEUE — RabbitMQ
- Single exchange, routing key url.visited
- Dead-letter queue for failed messages
- URL Service publishes; Analytics Service consumes

CACHE — Redis
- shortCode → longURL with 24h TTL, LFU eviction
- Refresh tokens with TTL
- IP rate-limit counters (token-bucket)

DATABASE — PostgreSQL

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR DEFAULT 'user',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE urls (
  id          BIGSERIAL PRIMARY KEY,
  short_code  VARCHAR(10) UNIQUE NOT NULL,
  long_url    TEXT NOT NULL,
  user_id     UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_urls_code ON urls(short_code);
CREATE INDEX idx_urls_expires ON urls(expires_at);

CREATE TABLE visits (
  short_code  VARCHAR(10),
  visited_at  TIMESTAMPTZ,
  country     VARCHAR(2),
  referrer    TEXT,
  user_agent  TEXT
) PARTITION BY RANGE (visited_at);

CREATE TABLE cleanup_runs (
  id            BIGSERIAL PRIMARY KEY,
  run_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted_count INT,
  duration_ms   INT
);

---
API CONTRACT
---

POST /auth/signup     { email, password } → 201 { token, user }
POST /auth/login      { email, password } → 200 { token, user }
POST /auth/refresh    cookie → 200 { token }

POST /shorten         { url, alias?, expiresIn? } → 201 { shortUrl, code, expiresAt }
GET  /urls            → 200 [{ code, longUrl, clicks, expiresAt, createdAt }]
DELETE /urls/:code    → 204
GET  /:code           → 302 + X-Cache: HIT|MISS

GET  /analytics/:code → 200 { totalClicks, clicksByDay[], topReferrers[], countries[] }

POST /admin/cleanup   → 200 { deletedCount, durationMs }
GET  /admin/runs      → 200 [{ runAt, deletedCount, durationMs }]

---
TECHNICAL REQUIREMENTS
---

- Stack: Node.js + TypeScript (Fastify) for all services; React + TypeScript + Vite + Tailwind for the frontend
- Each service has its own Dockerfile (multi-stage: builder + slim runtime)
- docker-compose.yml wires all 4 services, frontend (Nginx), PostgreSQL, Redis, RabbitMQ
- JWT in memory on client; refresh token in HttpOnly cookie
- Every service exposes GET /health
- JSON structured logging with traceId on every request
- Graceful shutdown on every service
- Unit tests: Base62 encoder, cache-aside lookup, JWT sign/verify, expiry cron
- Frontend: loading skeletons, error banners, empty states on every page

---
DELIVERABLES — IN THIS ORDER
---

1. Full monorepo folder structure with a one-line description per file
2. docker-compose.yml + infra/postgres/init.sql
3. Auth Service — complete source
4. URL Service — complete source
5. Analytics Service — complete source
6. Cleanup Worker — complete source
7. Frontend — complete source for all pages, components, and API layer
8. README.md — local setup, end-to-end walkthrough, how to run tests
9. Brief answers: (a) preventing duplicate short codes under concurrency, (b) Redis unavailability fallback, (c) scaling to 10k redirects/sec, (d) JWT refresh flow