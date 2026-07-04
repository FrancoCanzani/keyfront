# api-gateway — build plan

## Product

Put your API behind us; get **API keys, rate limiting, usage analytics, and
billing** with zero code changes. Publishers point their API at the gateway;
their consumers hit us and we authenticate, limit, meter, and forward to the
origin. We charge the **publisher** a SaaS fee (Flow 1). Consumer payments never
touch us.

## Two planes, two languages

- **Data plane** (`apps/gateway`, **Go**) — the proxy. Consumers' traffic on
  `*.gw.example.com`. Hot, stateless, scales horizontally. Reads config from
  Redis (cache) + Postgres. Go for throughput, low memory, predictable p99.
- **Control plane** (`apps/web`, **Bun + Hono + TanStack Router**) — the API +
  dashboard publishers use to manage services/keys/plans/usage/billing. Owns the
  database schema (Drizzle) and auth (better-auth).

The control plane **writes** the config (publishers, services, plans, keys); the
Go data plane **reads** it. One shared Postgres is the source of truth.

## Stack

**Control plane (`apps/web`)**

- **Bun** runtime; **Hono** API; **TanStack Router** SPA (Vite).
- **better-auth** (magic link + organization plugin) for auth.
- **Drizzle** ORM over **Postgres** (`postgres.js`); drizzle-kit migrations.
- **@hono/zod-validator** for input; chained routers so RPC types flow to the
  client (not OpenAPI — that's only if we expose a public documented API).
- shadcn (new-york / neutral) + Tailwind v4. TanStack Query. zod.
- Dev: Vite serves the SPA (:5173) and proxies `/api` → Hono (:8787). Prod: Hono
  serves the built SPA + API.

**Data plane (`apps/gateway`)**

- **Go**: `chi`, `pgx`, `go-redis`, `httputil.ReverseProxy`.
- Reads the Drizzle-owned schema (plain `pgx` now; `sqlc` later).
- **Redis** (self-hosted) for rate-limit buckets + hot config cache + usage
  counters.

## Architecture

```
consumer → Cloudflare (TLS, DDoS)
             → gateway (Go, Hetzner)
                 route(host) → auth(key) → ratelimit → meter → proxy(origin)
                     │ reads (via Redis + in-mem cache)
publisher → control plane (Hono + TanStack SPA)
                     │ writes (Drizzle)
              Postgres (source of truth)  ← both planes
              Redis (RL + cache + usage)  ← data plane
```

## Database & environments

### One shared Postgres, one schema owner

Both planes talk to the **same** Postgres database (`api_gateway`). The control
plane (Drizzle) is the **single schema owner**; the Go data plane is a read-only
consumer of that schema. There is exactly one migration system (drizzle-kit) —
**the Go side never migrates**, it only reads tables.

### Dev

- **Postgres**: local via brew (`postgres@16`), no Docker. DB `api_gateway`,
  `DATABASE_URL=postgres://localhost/api_gateway`.
- **Redis**: local via brew, `REDIS_URL=redis://localhost:6379`.
- **Schema**: `bun run db:generate` (author schema → SQL in `apps/web/drizzle/`)
  then `bun run db:migrate:dev` (apply to local). Franco runs these.
- **Gateway routing in dev**: `ENV=development` (the default) → the gateway uses
  the **static host map** (`utils.ResolveLocalHost`) and does **not** query
  Postgres for routing. It still connects to PG/Redis at boot (readiness), but
  the proxy path needs no DB rows — you can build/test the proxy with zero data.
- **`.env` files** (both gitignored): root `.env` (the gateway loads it via
  `godotenv` from `../../.env`) and `apps/web/.env` (Bun auto-loads it).

### Prod

- **Postgres**: **PlanetScale** (Postgres engine, PS-5 · single node · EBS).
  Same wire protocol as local Postgres, so the Drizzle/pgx code is unchanged —
  only `DATABASE_URL` differs.
- **Redis**: **self-hosted** on the Hetzner box (ephemeral, fail-open — losing
  it degrades, never corrupts).
- **Migrations**: applied to PlanetScale by pointing `DATABASE_URL` at prod and
  running `bun run db:migrate` as a **deploy step** (or from CI). Never
  auto-migrate at runtime, never on the hot path.
- **Gateway routing in prod**: `ENV=production` → routing reads from Postgres,
  cached in Redis + in-memory (never the static map).

### Migration flow (who runs what)

1. Franco edits the Drizzle schema in `apps/web/src/server/db/schema/`.
2. `bun run db:generate` → versioned SQL written to `apps/web/drizzle/` (**committed**).
3. `bun run db:migrate:dev` (or `:prod`) → applies pending migrations to whatever `DATABASE_URL` points
   at (local in dev, PlanetScale in prod).
4. The Go data plane reads the resulting tables. It never generates or applies.

### How the Go data plane reads the schema

- **Now (MVP):** plain `pgx` queries (e.g. `select origin_url from services
  where host_key = $1`). No codegen, simplest.
- **Later:** `sqlc` pointed at `apps/web/drizzle/` (the generated DDL) for typed
  queries — one source of truth, no drift between the two languages.
- **Hot-path rule:** **never a Postgres round-trip per request in prod.** Resolve
  host→origin and key→config once, cache them in Redis + a small in-memory LRU
  (short TTL); Postgres is only the cold-start / cache-miss fallback. On a
  config change the control plane bumps a cache version / evicts the key.

### The dev↔prod switch

`cfg.IsDev()` selects the resolver:

- dev → static map (`ResolveLocalHost`)
- prod → DB-backed (`ResolveHost(ctx, db, host)` + cache)

`ENV` defaults to `development` and **must** be set to `production` on deploy —
otherwise prod would serve the dev host-map. That belongs in the deploy config.

### Connection strings (env)

| var | dev | prod |
|---|---|---|
| `DATABASE_URL` | `postgres://localhost/api_gateway` | PlanetScale URL |
| `REDIS_URL` | `redis://localhost:6379` | self-hosted on Hetzner |
| `ENV` | `development` (default) | `production` (set explicitly) |

### Why this shape

- One schema owner (Drizzle) → no two migration systems fighting over the same DB.
- Local Postgres = same engine as PlanetScale → real dev/prod parity, no
  "worked locally" surprises.
- **Managed** Postgres in prod (never self-host the source of truth); **self-
  hosted** Redis (ephemeral, fail-open, cheap — losing it isn't catastrophic).

## Data model (Drizzle, `apps/web/src/server/db/schema/`)

**auth** (better-auth) — done: `user, session, account, verification,
organization, member, invitation`. A **publisher = a better-auth organization**;
services and keys are organization-scoped.

**gateway** (next — Franco owns this) — the config the data plane reads:

```
services      id · organization_id · name · host_key (unique) · origin_url · created_at
plans         id · service_id · name · rps · burst · monthly_quota · price_cents
consumers     id · service_id · external_ref · created_at
api_keys      id · consumer_id · plan_id · key_hash (sha256, unique) · prefix
              · status (active|revoked) · created_at · last_used_at
usage_rollup  key_id · window_start · count            (flushed from Redis)
billing       organization_id · stripe_customer_id · status (active|past_due|…)
```

- Store only `sha256(key)`; the raw key is shown once at creation.
- `host_key` is the routing key (`acme` → `acme.gw.example.com` → origin).
- Billing `status` gates the hot path (unpaid publisher → 402).

## Best practices (from Vigil / uplight conventions)

- **bun** for JS. **No Docker** locally (brew Postgres/Redis).
- **Do not run dev servers** in agent sessions; Franco runs them. Prefer
  `go build ./...` / `bunx tsc -b` to verify.
- **Franco writes all the Go.** Agents guide; they don't author `.go` unless told.
- **No barrel files.** A domain `index.ts` composing verb routers via `.route()`
  is a composition root, not a barrel.
- **No unnecessary comments** — only note constraints the code can't express.
- Sentence case for UI copy; conditional rendering as `cond ? <JSX/> : null`.
- **Hono:** `routes/protected` + `routes/public`, one folder per domain, one file
  per verb, `schemas.ts` (zod); validate every input; app-level `logger()`.
- **Multi-tenant:** every query is organization-scoped; never trust an id without
  confirming ownership.
- **Drizzle:** author schemas in `db/schema/<domain>.ts`; Franco runs
  `db:generate` / `db:migrate`; never edit the generated `drizzle/` folder.
- **Hot path (Go):** no Postgres per request (Redis + in-mem LRU); usage metering
  fire-and-forget; **fail open** on rate limiting if Redis is down.
- **Security:** strip `Authorization` before forwarding (don't leak the gateway
  key to origins); inject `X-Gateway-Secret`; verify Stripe webhook signatures.

## Roadmap (thin vertical slices)

- **Slice 1 — proxy forwards** ✅ host → origin (dev map) → `httputil` reverse
  proxy → response streamed back.
- **Slice 2 — auth + real routing:** swap the dev map for a `services` lookup;
  validate `gw_live_…` keys → 401 or forward. Strip the auth header before
  forwarding.
- **Slice 3 — rate limiting:** `plans` + Redis token bucket → 429 + headers,
  fail-open.
- **Slice 4 — usage metering:** async counters → flush worker → `usage_rollup`.
- **Slice 5 — billing (Flow 1):** Stripe publisher subscription + webhooks →
  `status` → Redis → enforcement (402 for unpaid).
- **Slice 6 — control-plane features:** services / keys / usage — Hono routes +
  dashboard pages (org-scoped), retiring the seed/static map.
- **Slice 7 — deploy:** Go gateway on Hetzner + Cloudflare in front; control
  plane on Bun; `DATABASE_URL` → PlanetScale; self-host Redis; `ENV=production`.
- **Later — tiers:** caching, analytics, dev portal, alerts, status page.

## Open decisions

- Gateway schema reads: plain `pgx` now → `sqlc` (pointed at `apps/web/drizzle`)
  when queries grow.
- Reuse one `ReverseProxy` (`Rewrite` + context) once traffic warrants; per-
  request `NewSingleHostReverseProxy` is fine while forwarding is being built.
- Routing: subdomain (`acme.gw`) first; custom-domain CNAME + Cloudflare for SaaS
  later.
- Hosting: Hetzner + Cloudflare now; Fly multi-region only if latency demands.
- `src/server` vs `src/backend` for the Hono dir (uplight uses `backend`) — align
  when convenient.
