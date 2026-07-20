# vurl

Bare-bones scaffold for vurl, a URL shortener.

- **`apps/web/`** — Bun + Hono + TanStack Router control plane + dashboard.
  better-auth (magic link + organization), Drizzle (Postgres), shadcn/Tailwind.

## Dev

```bash
bun install
bun dev             # starts Postgres if down, then turbo: web (Vite :5173, Hono :8787)
```

- Open http://localhost:5173 — sign in via magic link (the link is printed to
  the server console in dev).
- Schema: `bun run db:generate` (drizzle-kit generate), then
  `bun run db:migrate:dev` (apply locally) or `bun run db:migrate:prod`
  (PlanetScale, reads `DATABASE_URL_PROD`) — all from the repo root.

Local Postgres runs as a brew service (no Docker). Swap `DATABASE_URL` for
PlanetScale at deploy.

## Status

Auth (better-auth, magic link + organization) wired end-to-end; `/api/health`;
dashboard shell with no shortener domain logic yet.
