# Keyfront — product plan

The product: Supabase for API builders. Someone with an API worth selling gets
keys, plans, rate limits, metering, billing numbers, and a customer-facing
portal without building any of it. Two on-ramps, one data model:

- **Proxy** (zero code): point a subdomain at us, we sit in the request path.
- **Verify** (out of path): call our verify endpoint or SDK from their own
  backend. Same keys, same plans, same usage units either way.

We orchestrate billing, Stripe touches the money. We never process payments;
we push usage into the builder's own Stripe account and hand them invoice-ready
numbers. Differentiation is not price and not "gateway": competitors stop at
verified keys, we go all the way to paid.

State today: gateway resolves Host → upstream from Redis with a TTL'd in-memory
cache and proxies with secret injection. Control plane covers the config
surface: services, per-service plans, identities (Unkey-style externalId),
keys, all write-through to Redis inside Postgres transactions. Go lessons and
done-when checklists live in `path.md`.

---

## Phase 1 — the data plane earns trust (Go, path.md ch. 5–6)

1. **Key authentication** (ch. 5). Everything needed is in Redis:
   `route:<host>` carries service_id; `key:<sha256 of token>` carries id,
   organization_id, identity_id (nullable), service_id, plan_id, environment,
   status. Decisions made: unknown key 401; revoked 403; key whose service_id
   does not match the resolved route 403. Cache key lookups like routes; put
   key id, org id, plan id on the request context.
2. **Rate limiting** (ch. 6). Limits come from `plan:<plan_id>` (rate_limit per
   second, burst). Count in Redis so instances share a budget, fail open when
   Redis is down, 429 with Retry-After and X-RateLimit headers.

## Phase 2 — metering in credits, not requests

The unit of billing is a **credit**, not a request, because variable-cost APIs
(AI above all) price per call differently. Design before building either side
and record the contract in AGENTS.md:

- Proxy path: the origin reports cost via a response header
  (X-Keyfront-Units, default 1 when absent). The gateway reads it, nothing else
  changes in the hot path.
- Plans carry a monthly credit allowance (the current monthlyQuota column
  becomes credits). The gateway increments a per-key counter for the calendar
  month and rejects once the allowance is spent.
- Request logging (ch. 7): capture status, latency, bytes, units, key id, host,
  path without blocking the hot path; batch into a Redis Stream. The web side
  drains the stream into a request_logs table and builds the two stubbed
  pages: request logs and usage, per service, rolled up per identity too.

## Phase 3 — hardening and ship (ch. 8–10)

- Resilience: server timeouts, upstream deadlines, graceful shutdown that
  drains in-flight requests and flushes the log channel. Close the two review
  gaps: negative caching for unknown hosts, singleflight on cache refresh.
- One security must before anything public: an upstream must resolve to a
  public address, checked at request time, or the proxy is an SSRF machine.
- Tests: resolver table tests, httptest over 401/403/404/429/502/200, fakes
  for Redis, green under the race detector.
- Deploy: gateway to Fly (Dockerfile and fly.toml exist), health checks,
  env-only config. Wildcard DNS and TLS for the host suffix, started early
  because it is calendar time. Managed Postgres; Redis co-located with the
  gateway region. Web deployed with GATEWAY_HOST_SUFFIX on the real domain.
  Smoke test the loop in prod: service → plan → key → curl → request log.

## Phase 4 — verify on-ramp (web)

The out-of-path mode, and the default sell for anyone nervous about a proxy in
their request path. A public verify endpoint: takes a key, returns valid or
not, identity, plan, remaining credits, and accepts a unit count to meter the
call. Rate limiting and quota enforced on the same Redis state the proxy uses.
Thin SDKs later (start with one language, likely TypeScript). The proxy becomes
the premium zero-code tier, not the identity of the product.

## Phase 5 — billing: they charge their users

- **Stripe connect**: builder links their Stripe account; we map plans to their
  Stripe prices and push metered usage into their account. Invoices, tax, and
  collection happen in Stripe under their name.
- **Hosted checkout**: upgrade links that create the subscription; the webhook
  flips the key's plan.

## Phase 6 — developer portal and docs

The Supabase move: a hosted page per service where the builder's customers
self-serve. Sign up, get a key, see a usage bar against their plan, upgrade
through the hosted checkout. Add a per-service quickstart page (how to call
the API with your key); OpenAPI-driven docs can come later behind it. This is
what turns the product from infrastructure into "my API is a business."

---

## Cut until further notice

Payment processing of any kind, key rotation UI, org and team management,
identity meta editing, inline identity creation in the issue-key dialog,
pub/sub cache invalidation (TTL is fine), multi-region, custom domains (will
be requested fast, still out), MCP-server monetization (same product pointed
at agents; revisit when the payment rails mature).
