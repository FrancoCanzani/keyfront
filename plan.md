# api-gateway — build plan

## Product

Put your API behind us; get **API keys, rate limiting, usage analytics, and
billing** with zero code changes. Publishers point their API at the gateway;
their consumers hit us and we authenticate, limit, meter, and forward to the
origin. We charge the **publisher** a SaaS fee (Flow 1). Consumer payments never
touch us.

Two planes, deployed separately:

- **Data plane** — the proxy. Consumers' traffic on `*.gw.example.com`. Hot,
  stateless, scales horizontally. Reads config from Redis (cache) + Postgres.
- **Control plane** — manage services/keys/plans/usage/billing. Low traffic.

## Stack

- **Runtime:** Bun.
- **Framework:** Hono. `@hono/zod-openapi` for typed routes + OpenAPI; spec at
  `/doc`, Swagger UI at `/ui`. Proxy via `hono/proxy`.
- **Validation:** zod (single source: schema → validation → OpenAPI → RPC types).
- **DB:** Drizzle ORM over Postgres (`postgres` / postgres.js driver). Local
  Postgres in dev; PlanetScale (Postgres) at deploy — same wire, swap the URL.
- **Cache / RL / usage counters:** Redis via `ioredis`. Self-hosted (fail-open).
- **Migrations:** drizzle-kit (`db:generate` / `db:migrate` / `db:push`).
- **Dashboard:** Next.js; talks to the control plane over `/api/*` (Next rewrite).
- **Monorepo:** bun workspaces + turbo. `bun dev` runs backend + dashboard.

## Architecture

```
consumer → Cloudflare (TLS, DDoS, free egress)
             → gateway (data plane, Bun/Hono, Hetzner)
                 route(host) → auth(key) → ratelimit → meter → proxy(origin)

publisher → dashboard (Next) ──/api rewrite──► control plane (Hono)
                                                   │ writes (Drizzle)
                                          Postgres (source of truth)
                                                   │ projects config
                                          Redis (cache + RL + usage counters)
```

The data plane never depends on the control plane or Postgres on the hot path —
it serves from Redis (+ in-memory LRU). Control-plane writes project a
denormalized copy into Redis and bump a version to invalidate caches.

## Target structure

```
api-gateway/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.ts          # control plane: OpenAPIHono, mounts routes, /doc /ui
│   │   │   ├── gateway.ts         # data plane entry: host routing + proxy
│   │   │   ├── config.ts
│   │   │   ├── db/
│   │   │   │   ├── index.ts       # drizzle client + checkDb
│   │   │   │   └── schema/        # drizzle tables, one file per domain
│   │   │   ├── redis.ts
│   │   │   ├── routes/            # control-plane features: one folder per domain
│   │   │   │   └── <domain>/      #   get-all.ts get.ts post.ts patch.ts
│   │   │   │       ├── schemas.ts #   zod
│   │   │   │       ├── shared.ts  #   helpers (e.g. findService)
│   │   │   │       └── index.ts   #   composes verbs via .route()
│   │   │   ├── auth/              # key gen/hash/validate (+ LRU cache)
│   │   │   ├── ratelimit/         # redis token bucket (Lua via ioredis)
│   │   │   ├── usage/             # async counters + flush worker
│   │   │   ├── billing/           # stripe (Flow 1)
│   │   │   └── middleware/
│   │   ├── drizzle/               # generated migrations (do not edit)
│   │   ├── drizzle.config.ts · tsconfig.json · package.json
│   └── dashboard/                # Next.js (publisher UI + dev portal)
├── packages/
│   ├── sdk/                      # TS SDK (SDK-mode, later)
│   └── ui/                       # shared React (optional)
├── deploy/                       # Dockerfile / systemd / fly (later)
├── turbo.json · package.json
```

## Data model (Postgres via Drizzle, `src/db/schema/`)

- `publishers` — our customers. Billing status gates the hot path.
- `services` — a publisher's upstream: `host_key`, `origin_url`.
- `plans` — `rps`, `burst`, `monthly_quota`, `price_cents`.
- `consumers` — the publisher's end-users.
- `api_keys` — `key_hash` (sha256, never raw), `prefix`, `plan_id`, `status`.
- `usage_rollup` — `(key_id, window_start, count)`, flushed from Redis.

## Dependencies

**Backend (installed)**

- `hono`, `@hono/zod-openapi`, `@hono/swagger-ui`, `zod`
- `drizzle-orm`, `postgres` (postgres.js), `ioredis`
- dev: `drizzle-kit`, `bun-types`, `typescript`

**Backend (later, per phase)**

- `lru-cache` — hot-path key cache
- `stripe` — billing (Flow 1)

**Dashboard**

- `next`, `react`, `@tanstack/react-query`, `zod`, `tailwindcss` + shadcn.
  No ORM on the JS side — the dashboard calls the control plane over `/api/*`.

## Best practices

**General**

- **bun** for everything. No Docker locally (brew Postgres/Redis).
- Don't build or start a dev server after every change — prefer `bunx tsc
  --noEmit` (typecheck) or lint; only run when a change needs runtime checking.
- **No barrel files.** Import from the file that defines the symbol. (A domain
  `index.ts` that composes verb routers via `.route()` is a composition root,
  not a barrel.)
- **No unnecessary comments** — only note constraints the code can't express.
- Sentence case for UI copy; no all-caps for hierarchy.

**Backend (Hono)**

- **One domain per folder, one file per verb** in `src/routes/<domain>/`:
  `get.ts`, `post.ts`, etc., each a small chained `new OpenAPIHono()` router,
  plus `schemas.ts` (zod) and `index.ts` composing them via `.route()`.
- **Chain routes** so RPC types flow to the dashboard client; export the app
  type from `src/index.ts`.
- **Validate every input** with zod (`@hono/zod-openapi` route schemas).
- App-level `logger()`; request IDs; graceful shutdown.
- **Multi-tenant:** every query is publisher-scoped. Never trust a
  `serviceId`/`keyId` without confirming it belongs to the caller.

**Hot path (data plane)**

- No Postgres on the hot path — resolve keys/routes from Redis + in-mem LRU.
- Usage metering is fire-and-forget; never block the response.
- **Fail open** on rate limiting if Redis is unreachable; serve known keys from
  cache if Postgres is down.
- Stateless: any instance serves any request; scale horizontally.

**Security**

- Store only `sha256(key)`; the raw key is shown once at creation.
- Inject `X-Gateway-Secret` to origins so they can reject direct bypass.
- Verify Stripe webhook signatures before acting.

**Database (Drizzle)**

- Author schemas in `src/db/schema/<domain>.ts`. Franco runs `db:generate` /
  `db:migrate`; do not edit the generated `drizzle/` folder.
- Timestamps `timestamp`, JSON columns typed via `$type<...>()`, enums via
  `text({ enum: [...] })`.

## Roadmap

- **Phase 3 — Gateway core:** Drizzle schema + migrations → host routing →
  proxy (`hono/proxy`) → auth (key hash + LRU) → ratelimit (redis Lua) → usage.
  Milestone: authed, limited, metered, forwarded request through `*.localhost`.
- **Phase 4 — Control plane + SDK:** routes to register services/plans, mint/
  revoke keys, read usage; publisher `status` gate on the hot path.
- **Phase 5 — Billing (Flow 1):** Stripe publisher subscription + webhooks →
  status → Redis → enforcement.
- **Phase 6 — Dashboard:** Next wired to the control API via `/api/*` rewrite;
  keys/usage/plans UI, typed against the exported app type.
- **Phase 7 — Deploy:** Bun on Hetzner + Cloudflare in front; swap
  `DATABASE_URL` to PlanetScale; self-host Redis.
- **Later — tiers:** caching, analytics, dev portal, alerts, status page.

## Open decisions

- Data plane + control plane as two Bun entrypoints in one package (current
  plan) vs. two packages — keep one package until it hurts.
- Routing: subdomain (`acme.gw`) first; custom-domain CNAME + Cloudflare for SaaS
  later.
- Hosting: Hetzner + Cloudflare now; Fly multi-region only if latency demands.
