# Keyfront — roadmap

Put a customer's API behind us; they get keys, rate limiting, usage, and
billing with zero code changes.

## Where we are

The core loop works end to end:

- **Gateway (Go, `apps/gateway`)** — host routing (Redis `route:{host}`, 30s
  in-mem cache), key auth (sha256 lookup `key:{hash}`, fail closed), GCRA rate
  limiting per key from `plan:{id}` (redis_rate, fail open), monthly quota
  (`usage:{keyId}:{YYYY-MM}` INCR, fail open), header hygiene (strip caller
  key, inject `X-Gateway-Secret`, honor `X-Keyfront-Host` for workerd callers).
- **Control plane (Hono on workerd, `apps/web`)** — services, plans, keys,
  identities, workspaces/teams/invitations, playground; write-through sync to
  Redis on every mutation plus full backfill via `bun run redis:sync`.
- **Usage drain** — cron (`* * * * *` in wrangler.jsonc) sweeps monthly
  counters into Postgres `usage_rollup` (idempotent upsert).

## Usage data path (the part that matters)

The gateway **never talks to Postgres**. Usage flows one way, through Redis:

```
request → gateway INCR usage:{keyId}:{YYYY-MM}   (same op enforces quota)
                         │
                         ▼  every minute (cron → scheduled handler)
          drainUsage() SCANs usage:*, upserts usage_rollup
                         │
                         ▼
          Postgres usage_rollup (org, service, key, period_start, requests)
                         │
                         ▼
          dashboard Usage page / billing computation
```

Invariants to preserve:

- **One Redis op per request** for metering; quota enforcement and the billing
  counter are the same INCR. Nothing on the hot path blocks on Postgres, ever.
- **Counters are absolute, drains are idempotent.** `drainUsage`
  (`src/backend/lib/usage-drain.ts`) writes the counter value with
  `onConflictDoUpdate` on `(key_id, period_start)` — re-runs converge, crashes
  can't double-count. Counters are never reset; a new month is a new key name,
  and a ~40-day TTL garbage-collects old ones (TTL must outlive the month so
  the drain can sweep it after close).
- **Counters record attempts.** Over-quota requests still INCR. Billing must
  use `min(requests, plan.monthly_quota)`.
- Keys/plans sync (`lib/sync.ts` ↔ gateway `store.go`) stays lockstep:
  snake_case JSON, same hashing (`lib/keys.ts` ↔ `internal/auth`).

## What's left

### 1. Usage page (frontend only — data is already in Postgres)

`usage_rollup` is populated; the sidebar "Usage" item has no route. Page per
service: requests this month per key, quota consumption bar, monthly total.
Backend route reads `usage_rollup` scoped by org + service.

### 2. Daily granularity (gateway + drain)

Monthly rows can't draw a chart. Add a second INCR in the gateway pipeline:
`usage:{keyId}:{YYYY-MM-DD}` (~3-day TTL). **Decide one granularity for
`usage_rollup` rows before mixing** — either rollup stays monthly and daily
lives in Redis only, or rollup becomes daily and monthly = SUM. Do not store
both granularities in one table (double counting).

### 3. Async metering (gateway)

Buffered channel + drain goroutine for per-request events (status, latency,
`lastUsedAt`). Drop on overflow — a full buffer costs a datapoint, never a
request. Prerequisite for request logs and latency charts.

### 4. Request logs

Needs a storage decision first (Postgres table with retention vs. something
else). Don't start as a side quest.

### 5. Billing computation

Meter + compute only — **never process payments**. Monthly job:
`min(requests, quota)` × plan pricing → invoice-shaped rows the dashboard can
show. Decide whether `kf_test_` keys are exempt from quota/billing (currently
they count).

### 6. Deploy

- Web: `wrangler deploy` (secrets: DATABASE_URL PlanetScale, REDIS_URL
  Upstash, BETTER_AUTH_*, CF email vars, GATEWAY_URL).
- Gateway: needs a home (Fly/Railway) + DNS `*.gw.keyfront.com` + TLS.
- Verify PlanetScale Postgres honors the composite FKs.

### 7. Hardening (before real traffic)

- Gateway: graceful shutdown, explicit proxy `Transport` timeouts, request
  body cap.
- Workspace deletion (needs Redis host-cleanup story) and role checks on
  service/key mutations (`organizationRole` is already in context).
- Stale comment in `lib/email.ts` claims the backend runs on Bun — it runs on
  workerd; the CF email binding is an option at deploy.
