# api-gateway

Put your API behind us and get keys, rate limiting, usage analytics, and
billing — with zero code changes.

Split into two planes:

- **`apps/gateway/`** — Go data plane (the proxy hot path). `chi`, `pgx`, `go-redis`.
- **`apps/control/`** — Bun + Hono + TanStack Router control plane + dashboard.
  better-auth, Drizzle (Postgres), shadcn/Tailwind.

The control plane owns the schema (Drizzle) and writes config; the Go data plane
reads it. Shared Postgres is the source of truth.

## Dev

```bash
bun install
make dev            # Go gateway (:8080) + control (Vite :5173, Hono :8787)

# or individually
make dev-gateway
make dev-control
```

- Control: open http://localhost:5173 — sign in via magic link (the link is
  printed to the server console in dev).
- Schema: `make generate` (drizzle-kit generate) / `make migrate` (apply).

Local Postgres + Redis run as brew services (no Docker). Swap `DATABASE_URL` for
PlanetScale at deploy; Redis stays self-hosted.

## Status

- Data plane (Go): `/health` pings Postgres + Redis.
- Control plane (Hono + TanStack): magic-link auth (better-auth) wired
  end-to-end; `/api/health`; dashboard shell.

See `plan.md` for architecture and roadmap.
