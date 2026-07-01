# api-gateway

Put your API behind us and get keys, rate limiting, usage analytics, and
billing — with zero code changes.

Polyglot monorepo:

- **`apps/backend/`** — Go module: gateway (data plane) + control plane + CLI. `chi`, `pgx`, `go-redis`.
- **`apps/dashboard/`** — Next.js publisher dashboard.
- **`packages/`** — shared TS packages (SDK, UI) — later.

## Dev

```bash
# everything (gateway :8080 + dashboard :3000)
make dev

# or individually
make dev-go
make dev-web
curl localhost:8080/health   # -> {"postgres":"ok","redis":"ok","status":"ok"}
```

Local Postgres + Redis run as brew services (no Docker). Swap `DATABASE_URL`
for PlanetScale at deploy; Redis stays self-hosted.

## Status

Phase 2 done: monorepo + Go backend + PG/Redis health check.
