# The Gateway Path

Learn Go by building `keyfront` — a production API gateway — from the bare scaffold to a
deployed, multi-tenant proxy. Every lesson teaches a Go concept **and** ships a real piece of
the product. No throwaway exercises: the code you write in Lesson 2 is still running in Lesson 20.

## How this works

- I explain the **concept** (the Go idea) and **why it matters here** (how the gateway uses it).
- I give you **instructions** and a **done-when** checklist.
- **You write the code.** I review, we fix, we move on.
- One lesson at a time. You drive the pace.

Rules of the road:
- Code has **no explanatory comments** — the code should read clearly on its own.
- We commit only when you ask.
- Each lesson ends with something you can *run* and *see work*.

## The product we're building

A reverse proxy that sits in front of your customers' upstream APIs and:

1. **Resolves** an incoming request to a tenant and their upstream origin.
2. **Authenticates** the caller's API key (short-token format, hashed, environment-scoped, pausable).
3. **Rate-limits** per key.
4. **Proxies** the request to the origin — streaming, never buffering.
5. **Logs** every request (status, latency) to `request_logs`.

Config (tenants, routes, keys) is written by the **Hono control plane** and read by this Go
gateway out of **Redis**. The gateway never writes config — it only reads and caches it.
Deployment target: a flat-cost VM on **Fly.io** (already scaffolded: `fly.toml`, `Dockerfile`).

```
client ──▶ [ keyfront gateway (Go) ] ──▶ customer upstream
                    │  ▲
             reads  │  │  writes
                    ▼  │
                 [ Redis ] ◀── Hono control plane (web app)
```

---

## Progress

Legend: `[ ]` not started · `[~]` in progress · `[x]` done

### Chapter 0 — Foundations
- [x] **0.1** Modules, packages & project layout — `cmd/` vs `internal/`
- [x] **0.2** `main`, `http.ListenAndServe`, and reading env config → `config` package

### Chapter 1 — The HTTP server & routing
- [x] **1.1** `net/http`: `Handler`, `ServeHTTP`, `ResponseWriter`, `*Request`
- [x] **1.2** chi router: routes, path params, sub-routers
- [x] **1.3** A real `/healthz` endpoint
- [ ] **1.4** Middleware: what `func(http.Handler) http.Handler` actually is

### Chapter 2 — Parsing & the resolver
- [x] **2.1** `net/url`: parsing hosts and building upstream URLs
- [x] **2.2** Structs — modeling a `Route`; the `store` package
- [x] **2.3** Errors as values — `(value, error)`, `errors.New`, comma-ok lookup
- [x] **2.4** `resolver.Resolve` — host ➜ upstream `*url.URL`

### Chapter 3 — The reverse proxy core
- [x] **3.1** `httputil.ReverseProxy` + `proxy.Handler` — live host-based routing
- [x] **3.2** Streaming vs buffering — ReverseProxy streams; we never touch the body
- [x] **3.3** Forwarding headers: `Rewrite` hook — `SetURL`, `SetXForwarded`, `Host`
- [x] **3.4** `ErrorHandler` — clean 502 + logged cause when the upstream is down

### Chapter 4 — Config & the Redis sync layer
- [x] **4.1** JSON in Go — `encoding/json`, struct tags, the sync contract with Hono
- [x] **4.2** Redis client (`go-redis`) + `context.Context`; `store.Get`, DI via `Handler(rdb)`; sentinel `ErrNoRoute` (404 vs 500)
- [x] **4.3** In-memory cache `store.Cache` with `sync.RWMutex`, read-through; proven 3 reqs → 1 Redis GET
- [x] **4.4** TTL freshness — `entry{route, fetchedAt}`, `time.Since < ttl`; proven expiry (pub/sub invalidation deferred until Hono publishes)

---

## How the rest works (build specs, not lessons)

From here each chapter is a **spec you build solo**: a goal, general instructions, the Go
concepts to go learn on your own, and a done-when to prove it. Write it, run it, and pull me
in when you're stuck or want a review — not for every line. Concepts you haven't met yet are
named so you know what to go read (Go docs / `go doc <pkg>`).

---

### Chapter 5 — Authentication middleware — [ ]

**Goal:** reject unauthenticated requests before they reach the proxy; attach the caller's key
identity to the request for everything downstream.

**Build:**
- A middleware `func(http.Handler) http.Handler` in a new `internal/auth` package, mounted with
  `router.Use(...)` *before* the proxy (but after `/healthz`, which stays public).
- Read the key from the `Authorization: Bearer <token>` header. Enforce your short-token format.
- Hash the presented key (`sha256`) and look up `key:<hash>` in Redis (via a cache like routes).
  The payload (sync.ts contract): `id`, `organization_id`, `identity_id` (nullable), `service_id`,
  `plan_id`, `environment` (live|test), `status` (active|revoked).
- Reject: missing/garbage → 401; `status: revoked` → 403; key whose `service_id` does not match
  the resolved route's `service_id` → 403 (a key for one service must not open another). Clean
  bodies, logged causes — same discipline as the proxy `ErrorHandler`.
- On success, stash the key's identity (org id, key id, plan id, environment) on the request
  context and call `next.ServeHTTP`.

**Learn:** middleware as handler-wrapping (`func(next http.Handler) http.Handler`); `chi`'s
`Use`; `crypto/sha256`; `crypto/subtle.ConstantTimeCompare` (why `==` on secrets is a timing
leak); `context.WithValue` + an **unexported context-key type** (never a bare string).

**Done when:** no header → 401; bad key → 401; paused key → 403; valid key → proxies through,
and a downstream log line can read the org/key id off the context.

---

### Chapter 6 — Rate limiting — [ ]

**Goal:** cap requests per key so one caller can't swamp an upstream; return `429` when over.

**Build:**
- Enforce per-key limits. Limits live on the key's plan: look up `plan:<plan_id>` in Redis
  (`rate_limit` per second, `burst`, `monthly_quota`), cached like routes and keys.
- Do the counting in **Redis** (`INCR` + `EXPIRE`, or a sorted-set sliding window) so multiple
  gateway instances share one count — an in-memory limiter would let N instances allow N× the
  limit. A Lua script (`EVAL`) makes the incr+expire atomic.
- Over the limit → `429` with `Retry-After` and `X-RateLimit-*` headers. Fail **open** if Redis
  is down (log it) — a limiter outage shouldn't take down all traffic.

**Learn:** Redis `INCR`/`EXPIRE`/`EVAL`; token-bucket vs fixed-window vs sliding-window (pick
one, know the tradeoff); why distributed state beats per-instance for this.

**Done when:** a key limited to N/min gets N× 200 then 429s with correct headers; killing Redis
makes it fail open, not error.

---

### Chapter 7 — Observability: request logging → Redis → PG drain — [ ]

**Goal:** record every proxied request (status, latency, bytes, key id) without slowing the
request, and get it to Postgres via the Hono drain — **the gateway never touches PG.**

**Build:**
- Wrap `ResponseWriter` to capture status code + bytes written (the default writer exposes
  neither after the fact).
- Time each request; build a log record (host, path, status, latency, key id from ctx, and
  units: read `X-Keyfront-Units` from the origin's response, default 1 — this is the billing
  unit, see `plan.md` phase 2).
- Push records onto a **buffered channel**; a single background goroutine drains the channel and
  `XADD`s them to a Redis Stream in batches. The request path never blocks on I/O — it just sends
  on the channel.
- (Hono side, not this repo) a consumer `XREAD`s the stream and bulk-inserts into `request_logs`.

**Learn:** `http.ResponseWriter` wrapping; goroutines + **channels** + `select`; buffered channels
& backpressure (what to do when the buffer is full — drop or block); Redis Streams (`XADD`);
`log/slog` for structured logs.

**Done when:** requests log status+latency; a burst doesn't add latency to the request path;
records land in the Redis Stream ready for the drain.

---

### Chapter 8 — Resilience — [ ]

**Goal:** the gateway degrades gracefully and shuts down without dropping in-flight requests.

**Build:**
- Set `http.Server` timeouts (`ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, `IdleTimeout`)
  — the zero-value server has none, which is a real DoS foot-gun.
- Give the proxy transport an upstream dial/response timeout via `context` deadlines.
- **Graceful shutdown:** catch SIGINT/SIGTERM with `signal.NotifyContext`, call `server.Shutdown`
  to drain in-flight requests, close Redis, flush the log channel, then exit.
- (Optional) retries on idempotent upstream failures + a simple circuit breaker.

**Learn:** `http.Server` timeout fields; `signal.NotifyContext`; `server.Shutdown(ctx)` and the
drain sequence; `context.WithTimeout`.

**Done when:** slow-loris-style requests time out; Ctrl-C lets an in-flight request finish before
the process exits (no dropped connections, no lost log records).

---

### Chapter 9 — Testing — [ ]

**Goal:** the core logic is covered without needing real Redis or real upstreams.

**Build:**
- Extract small **interfaces** where you need fakes (e.g. a `RouteGetter` the resolver depends on
  instead of `*store.Cache`) so tests inject a fake.
- Table-driven tests for `resolver` (host normalization, not-found, parse errors).
- `net/http/httptest` to drive the auth middleware and the proxy end-to-end against a fake
  upstream — assert 401/403/404/502/200 paths.
- A fake or miniredis for the cache/limiter tests.

**Learn:** `testing` + table-driven style; `net/http/httptest`; interface-based fakes for
Redis/upstreams; `go test -race`.

**Done when:** `go test ./...` covers the auth, resolver, cache, and limiter paths and passes
under `-race`, no external services required.

---

### Chapter 10 — Production — [ ]

**Goal:** shipped on Fly, observable, and tuned.

**Build:**
- Config from env (extend `config`), secrets via Fly secrets — no literals.
- Multi-stage `Dockerfile` → tiny static binary on a minimal base (`distroless`/`scratch`).
- Wire `/healthz` to Fly health checks; confirm rolling deploys keep serving.
- Load test (`vegeta`/`k6`), watch p99 latency + Redis load, tune cache TTL / pool sizes / timeouts.

**Learn:** multi-stage Docker for Go; `fly deploy` / `fly secrets`; a load-test tool; reading
latency percentiles.

**Done when:** a route added in the dashboard is live in prod within the TTL; deploys don't drop
traffic; the gateway holds target RPS at acceptable p99.

---

## Definition of done — production-ready checklist

- [ ] Routing: host → upstream from Redis, cached + TTL ✅ (done)
- [ ] Auth: keys validated, paused/env enforced, identity on context
- [ ] Rate limiting: per-key, distributed via Redis, 429 + headers, fails open
- [ ] Logging: async, non-blocking, → Redis Stream → PG drain (Hono side)
- [ ] Resilience: server timeouts, upstream deadlines, graceful shutdown
- [ ] Tests: core paths covered, green under `-race`, no external deps
- [ ] Deploy: multi-stage image on Fly, health checks, non-dropping rolling deploys
- [ ] The gateway talks to **Redis only** — never Postgres

When every box is checked, it's a shippable API gateway — and you'll have learned interfaces,
concurrency (goroutines/channels/mutexes), context, crypto, testing, and deployment by building,
not by tutorial.
