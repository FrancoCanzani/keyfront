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

## Architecture

```
consumer → Cloudflare (TLS, DDoS, free egress)
             → gateway (data plane, Hetzner)
                 route(host) → auth(key) → ratelimit → meter → proxy(origin)

publisher → dashboard (Next) ──/api rewrite──► control plane (chi)
                                                   │ writes
                                          Postgres (source of truth)
                                                   │ projects config
                                          Redis (cache + RL + usage counters)
```

The data plane never depends on the control plane or Postgres being up on the
hot path — it serves from Redis (+ in-memory LRU). Control-plane writes project
a denormalized copy into Redis and bump a version to invalidate caches.

## Target structure

```
api-gateway/
├── apps/
│   ├── backend/                 # one Go module, multiple binaries
│   │   ├── cmd/
│   │   │   ├── gateway/          # data plane (proxy)
│   │   │   ├── control/          # control-plane API (chi)
│   │   │   └── gwctl/            # CLI (drive control plane without UI)
│   │   ├── internal/
│   │   │   ├── config/           # env / .env
│   │   │   ├── store/            # pgx pool
│   │   │   ├── cache/            # redis client + config projection
│   │   │   ├── db/               # sqlc-generated (do not edit)
│   │   │   ├── routing/          # host → service/upstream
│   │   │   ├── proxy/            # httputil.ReverseProxy
│   │   │   ├── auth/             # key gen/hash/validate (LRU + singleflight)
│   │   │   ├── ratelimit/        # redis token bucket (Lua)
│   │   │   ├── usage/            # async counters + flush worker
│   │   │   ├── billing/          # stripe (Flow 1)
│   │   │   └── control/          # control-plane handlers
│   │   ├── db/
│   │   │   ├── migrations/       # goose *.sql
│   │   │   └── queries/          # sqlc *.sql
│   │   ├── sqlc.yaml · .air.toml · go.mod
│   └── dashboard/               # Next.js (publisher UI + dev portal)
├── packages/
│   ├── sdk/                     # TS SDK (SDK-mode, later)
│   └── ui/                      # shared React (optional)
├── deploy/                      # Dockerfile / fly.toml / systemd (later)
├── Makefile · turbo.json · package.json
```

## Data model (Postgres, via goose + sqlc)

- `publishers` — our customers. Billing status gates the hot path.
- `services` — a publisher's upstream: `host_key`, `origin_url`.
- `plans` — `rps`, `burst`, `monthly_quota`, `price_cents`.
- `consumers` — the publisher's end-users.
- `api_keys` — `key_hash` (sha256, never raw), `prefix`, `plan_id`, `status`.
- `usage_rollup` — `(key_id, window_start, count)`, flushed from Redis.

## Dependencies

**Go (backend)**

- `go-chi/chi/v5` — control-plane routing (not in the proxy hot path)
- `jackc/pgx/v5` — Postgres
- `redis/go-redis/v9` — Redis
- `joho/godotenv` — local `.env`
- `hashicorp/golang-lru/v2` — hot-path key cache
- `golang.org/x/sync/singleflight` — collapse concurrent cache misses
- `stripe/stripe-go` — billing (Phase 5)
- `prometheus/client_golang` — metrics (Phase 3+)
- tools: `air` (reload), `goose` (migrations), `sqlc` (typed queries)

**JS (dashboard)**

- `next`, `react` — dashboard
- `@tanstack/react-query` — data fetching against the control API
- `zod` — form/schema validation
- `tailwindcss` + shadcn — UI (add primitives as needed, no design system upfront)
- `turbo` + `bun` — monorepo

The dashboard has no direct DB access — it talks to the control plane over
`/api/*` (Next rewrite → chi), so there is no Drizzle/ORM on the JS side.

## Best practices

**General**

- **bun** for all JS package/scripts. No Docker locally (brew Postgres/Redis).
- **No unnecessary comments** — only note constraints the code can't express.
- No barrel files; import from the file that defines the symbol.
- Sentence case for UI copy; no all-caps for hierarchy.

**Go**

- One domain per `internal/<pkg>`; small, focused packages.
- Return wrapped errors (`fmt.Errorf("...: %w", err)`); never panic in handlers.
- `context.Context` with timeouts on every IO call.
- Config from env only; no secrets in code or git.
- `log/slog` structured logging; request IDs; graceful shutdown.
- Prometheus metrics on the data plane (latency, RL hits, upstream errors).
- Table-driven tests; cover auth, routing, and the rate-limit Lua explicitly.

**Hot path (data plane)**

- No Postgres on the hot path — resolve keys/routes from Redis + in-mem LRU.
- Usage metering is fire-and-forget; never block the response.
- **Fail open** on rate limiting if Redis is unreachable (protect the customer's
  uptime); serve known keys from cache if Postgres is down.
- Stateless: any instance can serve any request; scale horizontally.

**Security**

- Store only `sha256(key)`; the raw key is shown once at creation.
- Inject `X-Gateway-Secret` to origins so they can reject direct bypass.
- Verify Stripe webhook signatures before acting.
- Everything is publisher-scoped — never trust a `serviceId`/`keyId` without
  confirming it belongs to the caller.

**Database**

- Author goose migrations by hand; never edit an applied migration.
- `sqlc generate` for typed queries; no ORM. Do not edit generated `internal/db`.

## Roadmap

- **Phase 3 — Gateway core:** schema + sqlc → routing → proxy → auth → ratelimit
  → usage → wire the chain. Milestone: authed, limited, metered, forwarded
  request through `*.localhost`.
- **Phase 4 — Control plane + CLI:** register services/plans, mint/revoke keys,
  read usage; publisher `status` gate on the hot path.
- **Phase 5 — Billing (Flow 1):** Stripe publisher subscription + webhooks →
  status → Redis → enforcement.
- **Phase 6 — Dashboard:** Next wired to the control API; keys/usage/plans UI.
- **Phase 7 — Deploy:** binary + Hetzner + Cloudflare in front; swap
  `DATABASE_URL` to PlanetScale; self-host Redis.
- **Later — tiers:** caching, analytics, dev portal, alerts, status page.

## Open decisions

- One Go module with multiple `cmd/` (current) vs. split modules — keep one until
  it hurts.
- Routing: subdomain (`acme.gw`) first; custom-domain CNAME + Cloudflare for SaaS
  later.
- Hosting: Hetzner + Cloudflare now; Fly multi-region only if latency demands.
- Language: Go for the data plane; migrating to TS/Hono later is cheap if the DX
  pull wins.
