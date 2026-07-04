# Keyfront — agent conventions

Put a customer's API behind us; they get keys, rate limiting, usage, and billing
with zero code changes. See `plan.md` for architecture and roadmap.

## Working rules

- **Do not run dev servers or long-lived processes.** No `bun dev`, `go run`,
  `air`, `vite`, `bun run dev`, background servers, or anything that binds a
  port. Franco runs those himself. Leaving a process open squats on `:8080` /
  `:5173` / `:8787` / `:9000` and breaks his dev server. If you need to verify
  runtime behavior, ask Franco to run it and paste the output.
- **Do not `kill`/`pkill` dev processes** either — you don't know what's his.
- **Franco writes all the Go.** Agents guide only: explain the design, the
  stdlib to use, the gotchas, the file layout — Franco types it. Do not create
  or edit `.go` files unless he explicitly says "write it" / "add it".
- Prefer typecheck/build over running: `go build ./...`, `bunx tsc -b`.

## Stack

- **`apps/gateway`** — Go data plane (the proxy hot path). `chi`, `pgx`,
  `go-redis`, `httputil.ReverseProxy`. Franco owns all of it.
- **`apps/web`** — Bun + Hono + TanStack Router control plane + dashboard.
  better-auth (magic link + organization), Drizzle over Postgres, shadcn/Tailwind.
- Shared **Postgres** (local via brew in dev; PlanetScale at deploy). **Redis**
  self-hosted. **No Docker** locally.

## Conventions

- **bun** for all JS package/scripts.
- **No unnecessary comments** — only note constraints the code can't express.
- **No barrel files.** A domain `index.ts` that composes verb routers via
  `.route()` is a composition root, not a barrel.
- Sentence case for UI copy; `cond ? <JSX/> : null` for conditional rendering.
- **No em dashes in UI copy.** Use a period, comma, or colon ("—" as a
  missing-value placeholder in tables is fine).
- **Never hand-write `components/ui` primitives.** Always
  `bunx shadcn@latest add <component> --overwrite`; customize only after the
  CLI has generated the file.
- **Route files are route definitions only** — `createFileRoute` config
  (loader, search schema, `component:` reference). The page component lives in
  `features/<domain>/` and reads params/search via `getRouteApi("<route-id>")`.
  See `routes/sign-in.tsx` → `features/auth/sign-in.tsx`.

### Control plane (Hono, `apps/web/src/backend`)

- Structure mirrors uplight: `routes/protected` + `routes/public`, **one folder
  per domain, one file per verb** (`get-all.ts`, `post.ts`, …) plus `schemas.ts`
  and an `index.ts` that composes verbs via `.route()`.
- **`@hono/zod-validator`** (not OpenAPI) — validate every input; chain routers
  so RPC types flow to the dashboard client. OpenAPI only if we later expose a
  public documented API.
- **Multi-tenant:** every query is scoped to the caller's active organization.
- **Drizzle:** schema lives in `src/backend/db/`; Franco runs `db:generate` /
  `db:migrate`; never edit the generated `drizzle/` folder. The control plane
  owns the schema; the Go data plane reads it.

### Data plane (Go, `apps/gateway`)

- Routing is by **Host** (`acme.gw.example.com` → origin). Dev uses a static
  host→origin map behind a resolver; prod swaps it for a DB lookup (`cfg.IsProd()`).
- Hot path: no Postgres per request (Redis + in-mem cache); usage metering is
  fire-and-forget; **fail open** on rate limiting if Redis is down.
- Store only `sha256(key)`; inject `X-Gateway-Secret` to origins.

## Local testing

Franco runs `bun dev` (turbo: gateway :8080 + web :5173/:8787 + a throwaway
Hono echo origin on :9000). Proxy test:
`curl -H "Host: foo.localhost" localhost:8080/`.
