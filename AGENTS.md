# vurl — agent conventions

vurl, a URL shortener. Bare-bones scaffold: auth, dashboard shell, no
shortener domain logic yet.

## Working rules

- **Do not run dev servers or long-lived processes.** No `bun dev`,
  `vite`, `bun run dev`, background servers, or anything that binds a
  port. Franco runs those himself. Leaving a process open squats on `:5173` /
  `:8787` and breaks his dev server. If you need to verify runtime behavior,
  ask Franco to run it and paste the output.
- **Do not `kill`/`pkill` dev processes** either — you don't know what's his.
- Prefer typecheck/build over running: `bunx tsc -b`, `bunx vite build`.

## Stack

- **`apps/web`** — Bun + Hono + TanStack Router control plane + dashboard.
  better-auth (magic link + organization), Drizzle over Postgres, shadcn/Tailwind.
- **Postgres** (local via brew in dev; PlanetScale at deploy). **No Docker**
  locally.

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

- **One folder per domain, one file per verb** (`get-all.ts`, `post.ts`, …)
  plus `schemas.ts` and an `index.ts` that composes verbs via `.route()`.
- **`@hono/zod-validator`** (not OpenAPI) — validate every input; chain routers
  so RPC types flow to the dashboard client. OpenAPI only if we later expose a
  public documented API.
- **Multi-tenant:** every query is scoped to the caller's active organization.
- **Drizzle:** schema lives in `src/backend/db/`; Franco runs `db:generate` /
  `db:migrate`; never edit the generated `drizzle/` folder.

## Local testing

Franco runs `bun dev` (turbo: web on :5173/:8787).
