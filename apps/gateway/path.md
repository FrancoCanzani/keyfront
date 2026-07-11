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
- [ ] **4.4** Keeping the cache fresh — pub/sub or interval refresh

### Chapter 5 — Authentication middleware
- [ ] **5.1** Extracting the key — short-token format, `Authorization` header
- [ ] **5.2** Hashing & constant-time compare (`crypto/sha256`, `crypto/subtle`)
- [ ] **5.3** Passing data down the chain — `context.WithValue`, typed keys
- [ ] **5.4** Environments & paused keys — 401/403 the right way

### Chapter 6 — Rate limiting
- [ ] **6.1** Concurrency primer — goroutines, `sync.Mutex`, race detector
- [ ] **6.2** A token-bucket limiter, in-memory, per key
- [ ] **6.3** Distributed limiting in Redis (so multiple gateway instances agree)
- [ ] **6.4** Returning `429` with `Retry-After` and rate-limit headers

### Chapter 7 — Observability: request logging
- [ ] **7.1** Wrapping `ResponseWriter` to capture status & bytes
- [ ] **7.2** Measuring latency; structured logs with `log/slog`
- [ ] **7.3** Channels & a background writer — async logging without blocking the request
- [ ] **7.4** Batched writes to `request_logs`

### Chapter 8 — Resilience
- [ ] **8.1** Timeouts everywhere — `http.Server` timeouts, `context` deadlines
- [ ] **8.2** Retries & a circuit breaker for flaky upstreams
- [ ] **8.3** Graceful shutdown — `signal.NotifyContext`, draining in-flight requests

### Chapter 9 — Testing
- [ ] **9.1** Table-driven tests; testing the resolver
- [ ] **9.2** `net/http/httptest` — testing middleware and the proxy end-to-end
- [ ] **9.3** Fakes for Redis; testing the config cache

### Chapter 10 — Production
- [ ] **10.1** Config & secrets, `12-factor` style
- [ ] **10.2** The `Dockerfile` — multi-stage builds & a tiny final image
- [ ] **10.3** Deploy to Fly.io; health checks & rolling deploys
- [ ] **10.4** Load test, read the flame graph, tune, ship

---

## Concepts you'll own by the end

`interfaces` · `structs & methods` · `error handling & wrapping` · `net/http` internals ·
`middleware composition` · `goroutines / channels / select` · `sync.Mutex & RWMutex` ·
`context propagation & cancellation` · `JSON encoding` · `Redis` · `crypto basics` ·
`table-driven testing & httptest` · `graceful shutdown` · `Docker multi-stage` · `Fly deploy`

That's a full backend-Go education, and at the end you have a shippable product, not a
certificate.
