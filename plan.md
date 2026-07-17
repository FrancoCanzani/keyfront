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

Send side (`internal/proxy/proxy.go`): after resolve → auth → GCRA, and only
when `plan.MonthlyQuota > 0`, `monthlyUsage()` runs one pipelined
`INCR usage:{keyId}:{YYYY-MM}` + `EXPIRENX 40d` — a single round trip that is
both the quota check (reject when `used > quota`) and the billing counter.

Receive side (`src/backend/lib/usage-drain.ts`, cron `* * * * *` in
`wrangler.jsonc` → `scheduled` in `backend/index.ts`): SCAN `usage:*`, keep
names matching `usage:{keyId}:{YYYY-MM}`, GET each value, look up the key's
org/service in Postgres, upsert `usage_rollup` on `(key_id, period_start)`.
Counters for deleted keys are skipped and left for the TTL to collect.

Invariants to preserve:

- **One Redis round trip per request** for metering; quota enforcement and the
  billing counter are the same INCR. Nothing on the hot path blocks on
  Postgres, ever.
- **Counters are absolute, drains are idempotent.** The upsert writes the
  counter value (not a delta) — re-runs converge, crashes can't double-count.
  Counters are never reset; a new month is a new key name, and the 40-day TTL
  garbage-collects old ones (TTL must outlive the month so the drain can sweep
  it after close).
- **Counters record attempts.** Over-quota requests still INCR. Billing must
  use `min(requests, plan.monthly_quota)`.
- **Unlimited plans are invisible.** `monthly_quota = 0` skips the INCR
  entirely: no counter, no rollup row, nothing to bill or chart. Fine while
  quota-is-metering; the moment usage display or billing covers unlimited
  plans, the INCR must move out of the quota branch (or #3 async metering
  takes over as the counter source).
- Metering fails open: an INCR error is logged and the request proxies anyway.

## Config sync (Postgres → Redis)

Postgres is the source of truth; Redis is a full write-through copy the
gateway reads. Three key shapes (`lib/sync.ts` ↔ gateway `store.go`,
snake_case JSON, no TTL — config keys live until deleted):

- `route:{host}` → service_id, host, upstream, secret
- `key:{sha256hash}` → id, organization_id, identity_id, service_id, plan_id,
  environment, status
- `plan:{id}` → rate_limit, burst, monthly_quota

Every mutating route writes through in the same handler: services post/patch
sync the route, services delete removes its route + keys + plans; plans
post/patch/delete sync `plan:{id}`; keys post writes `key:{hash}`, revoke
rewrites it with `status: revoked` (auth rejects it — deliberate tombstone,
not a DEL); identities delete rewrites its keys revoked. Redis loss or drift
is repaired by full backfill: `bun run redis:sync`
(`scripts/sync.ts` re-emits every route/plan/key from Postgres).

Lockstep contracts: JSON field names with `store.go` structs, and key hashing
(`lib/keys.ts` ↔ `internal/auth`) — same sha256-of-plaintext on both sides.
Gateway layers a 30s in-mem cache over routes only; keys and plans are read
from Redis per request.

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

Meter + compute only — **never process payments**. Not started; the `plan`
table has **no pricing columns** (only rate_limit/burst/monthly_quota), so
this begins with schema:

- Pricing model on `plan` (flat monthly price and/or per-request price, in
  cents). Adding columns doesn't touch the gateway — `sync.ts`/`store.go`
  only carry the three limit fields.
- Monthly job (extend the existing cron handler): after a month closes, read
  its `usage_rollup` rows, compute `min(requests, monthly_quota)` × plan
  pricing per key, write invoice-shaped rows (org, period, line items,
  amount) the dashboard renders. Same idempotency rule as the drain: rerun
  converges, keyed on `(org, period)`.
- The drain keeps sweeping a closed month until the counter's TTL kills it
  (~day 10), so compute the invoice after that, or accept that early invoices
  can only grow and recompute on each run until the counter expires.
- Decide whether `kf_test_` keys are exempt from quota/billing (currently
  they count — environment is on the key, so the job can filter).
- Unlimited plans (`monthly_quota = 0`) have no counters at all today (see
  invariants) — flat-price them or fix metering first.

### 6. IP rules (firewall-lite, not a WAF)

**Do not build a WAF.** Payload inspection, bot signatures, and DDoS
absorption belong to Cloudflare in front of `*.gw.keyfront.com` at deploy —
volumetric attacks must die before they reach a Go process we pay for per
CPU-second. What a key-management gateway should own is the L7 slice tied to
its own objects:

- **Per-key IP allowlist** — pin a key to CIDRs ("this key only works from
  our servers"). The classic API-key feature; lives on the key JSON
  (`allowed_cidrs`), synced through `key:{hash}` like every other field.
- **Per-service IP blocklist** — dashboard "block this IP" against an abusive
  caller. Redis `block:{serviceId}` set (or on the route JSON), checked after
  resolve, before auth.
- Rules through the same write-through path as routes/keys/plans; gateway
  side is parse-CIDRs-once + `netip.Prefix.Contains` — no new infra.
- **Client IP is a prerequisite.** Direct traffic uses `RemoteAddr`;
  `X-Forwarded-For` must be trusted only from the proxy in front (CF at
  deploy), never from the caller, or blocks are trivially bypassed.
- Semantics decision: a missing/broken blocklist fails open (availability,
  like rate limiting), but a key **with** an allowlist that can't be
  evaluated should fail closed (it's an auth constraint).
- Sequencing: after #3/#4 — without request logs there is no way to see
  *which* IP is abusive, so blocklists would be flying blind.

### 7. Deploy

- Web: `wrangler deploy` (secrets: DATABASE_URL PlanetScale, REDIS_URL
  Upstash, BETTER_AUTH_*, CF email vars, GATEWAY_URL).
- Gateway: needs a home (Fly/Railway) + DNS `*.gw.keyfront.com` + TLS.
- Verify PlanetScale Postgres honors the composite FKs.

### 8. Hardening (before real traffic)

- Gateway: graceful shutdown, explicit proxy `Transport` timeouts, request
  body cap.
- Workspace deletion (needs Redis host-cleanup story) and role checks on
  service/key mutations (`organizationRole` is already in context).
- Stale comment in `lib/email.ts` claims the backend runs on Bun — it runs on
  workerd; the CF email binding is an option at deploy.
