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
- **Control plane** (`apps/control`, **Bun + Hono + TanStack Router**) — the API
  + dashboard publishers use to manage services/keys/plans/usage/billing. Owns
  the database schema (Drizzle) and auth (better-auth).

The control plane **writes** the config (publishers, services, plans, keys); the
Go data plane **reads** it. Shared Postgres is the source of truth.

## Stack

**Control plane (`apps/control`)**

- **Bun** runtime; **Hono** API; **TanStack Router** SPA (Vite).
- **better-auth** (magic link + organization plugin) for auth.
- **Drizzle** ORM over **Postgres** (`postgres.js`); drizzle-kit migrations.
- shadcn (new-york / neutral) + Tailwind v4. TanStack Query. zod.
- Dev: Vite serves the SPA (:5173) and proxies `/api` → Hono (:8787). Prod: Hono
  serves the built SPA + API.

**Data plane (`apps/gateway`)**

- **Go**: `chi`, `pgx`, `go-redis`. `httputil.ReverseProxy`.
- Reads the Drizzle-owned schema via typed queries (sqlc pointed at the
  control plane's generated migrations).
- **Redis** (self-hosted) for rate-limit buckets + hot config cache + usage
  counters.

**Shared:** Postgres (local in dev; PlanetScale at deploy). bun workspaces + turbo.

## Architecture

```
consumer → Cloudflare (TLS, DDoS)
             → gateway (Go, Hetzner)
                 route(host) → auth(key) → ratelimit → meter → proxy(origin)
                     │ reads
publisher → control plane (Hono + TanStack SPA)
                     │ writes (Drizzle)
              Postgres (source of truth)  ← both planes
              Redis (RL + cache + usage)  ← data plane
```

## Structure

```
api-gateway/
├── apps/
│   ├── gateway/                    # Go data plane
│   │   ├── cmd/gateway/main.go     #   proxy entry (currently /health)
│   │   ├── internal/{config,store,cache,routing,proxy,auth,ratelimit,usage}
│   │   └── db/queries/             #   sqlc queries (read the shared schema)
│   └── control/                    # Bun + Hono + TanStack Router
│       ├── src/
│       │   ├── frontend/           # TanStack Router SPA, shadcn, Tailwind
│       │   │   ├── routes/         #   __root, sign-in, auth.verify, _app/*
│       │   │   ├── features/       #   auth/…  (one folder per domain)
│       │   │   ├── components/ui/  #   shadcn primitives
│       │   │   └── lib/            #   rpc (typed Hono client), auth-client, utils
│       │   └── server/             # Hono API
│       │       ├── index.ts        #   app, /api/auth/*, /api/health, AppType
│       │       ├── auth.ts         #   better-auth (drizzle adapter, pg)
│       │       ├── db/             #   drizzle client + schema/ (source of truth)
│       │       ├── middleware/     #   auth
│       │       └── routes|features/ #  one folder per domain, one file per verb
│       ├── drizzle/                # generated migrations (committed)
│       └── vite.config.ts · drizzle.config.ts · components.json
├── Makefile · turbo.json · package.json
```

## Data model (Drizzle, `apps/control/src/server/db/schema/`)

- **auth** (better-auth): `user, session, account, verification, organization,
  member, invitation` — done.
- **gateway** (next): `publishers, services, plans, consumers, api_keys,
  usage_rollup` — the config the data plane reads.

## Best practices (from Vigil conventions)

- **bun** for JS. No Docker locally (brew Postgres/Redis).
- Don't build/start a dev server after every change — prefer `tsc -b` / lint.
- **No barrel files.** A domain `index.ts` that composes verb routers via
  `.route()` is a composition root, not a barrel.
- **No unnecessary comments** — only note constraints the code can't express.
- Sentence case for UI copy; conditional rendering as `cond ? <JSX/> : null`.
- **Hono:** one domain per folder, one file per verb; chain routes so RPC types
  flow to the client; validate every input with zod; app-level `logger()`.
- **Multi-tenant:** every query is org/publisher-scoped; never trust an id
  without confirming ownership.
- **Drizzle:** author schemas in `db/schema/<domain>.ts`; Franco runs
  `db:generate` / `db:migrate`; don't edit the generated `drizzle/` folder.
- **Hot path (Go):** no Postgres on the hot path (Redis + in-mem LRU); usage
  metering is fire-and-forget; fail open on rate limiting if Redis is down.
- **Security:** store only `sha256(key)`; inject `X-Gateway-Secret` to origins;
  verify Stripe webhook signatures.

## Roadmap

- **Phase 3 — Gateway config schema + data plane:** add gateway tables to Drizzle
  (control); point the Go gateway's sqlc at the generated migrations; build the
  hot path (routing → proxy → auth → ratelimit → usage).
- **Phase 4 — Control plane features:** services, plans, keys, usage — Hono
  routes + dashboard pages (publisher-scoped).
- **Phase 5 — Billing (Flow 1):** Stripe publisher subscription + webhooks →
  status → Redis → enforcement in the gateway.
- **Phase 6 — Deploy:** Go gateway on Hetzner + Cloudflare in front; control
  plane on Bun; swap `DATABASE_URL` to PlanetScale; self-host Redis.
- **Later — tiers:** caching, analytics, dev portal, alerts, status page.

## Open decisions

- Gateway sqlc schema source: point at `apps/control/drizzle` (generated DDL).
- Routing: subdomain (`acme.gw`) first; custom-domain CNAME + Cloudflare for SaaS
  later.
- Hosting: Hetzner + Cloudflare now; Fly multi-region only if latency demands.
