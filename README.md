# api-gateway

Put your API behind us and get keys, rate limiting, usage analytics, and
billing — with zero code changes.

Monorepo (bun + turbo):

- **`apps/backend/`** — Bun + Hono API. `@hono/zod-openapi`, Drizzle (Postgres), ioredis.
- **`apps/dashboard/`** — Next.js publisher dashboard.
- **`packages/`** — shared TS packages (SDK, UI) — later.

## Dev

```bash
bun install
bun dev              # backend (:8080) + dashboard (:3000) via turbo

curl localhost:8080/health   # -> {"status":"ok","postgres":"ok","redis":"ok"}
# OpenAPI spec at /doc, Swagger UI at /ui
```

Local Postgres + Redis run as brew services (no Docker). Swap `DATABASE_URL`
for PlanetScale at deploy; Redis stays self-hosted.

## Status

Phase 2: monorepo + Hono backend with PG/Redis health check and OpenAPI docs.
See `plan.md` for architecture, structure, and roadmap.
