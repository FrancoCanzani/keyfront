package proxy

import (
	"context"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/francocanzani/keyfront/internal/cache"
	"github.com/francocanzani/keyfront/internal/config"
	"github.com/francocanzani/keyfront/internal/utils"
)

type Proxy struct {
	cfg     config.Config
	rdb     *redis.Client
	routes  *cache.TTL[Route]
	keys    *cache.TTL[Key]
	plans   *cache.TTL[Plan]
	billing *cache.TTL[string]
}

func New(cfg config.Config, rdb *redis.Client) *Proxy {
	return &Proxy{
		cfg:     cfg,
		rdb:     rdb,
		routes:  cache.NewTTL[Route](),
		keys:    cache.NewTTL[Key](),
		plans:   cache.NewTTL[Plan](),
		billing: cache.NewTTL[string](),
	}
}

func (p *Proxy) Handle(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	hostKey, ok := utils.HostKey(r.Host, p.cfg.GatewayDomain)
	if !ok {
		http.Error(w, "unknown host", http.StatusNotFound)
		return
	}

	route, found, err := lookup[Route](ctx, p.rdb, p.routes, "route:"+hostKey)
	if err != nil {
		log.Printf("resolve route %s: %v", hostKey, err)
		http.Error(w, "upstream lookup failed", http.StatusBadGateway)
		return
	}
	if !found {
		// dev keeps the static map as a fallback so foo.localhost works with zero rows
		origin, devOK := "", false
		if p.cfg.IsDev() {
			origin, devOK = utils.ResolveLocalHost(r.Host)
		}
		if !devOK {
			http.Error(w, "unknown host", http.StatusNotFound)
			return
		}
		p.forward(w, r, origin)
		return
	}

	p.handleKeyed(ctx, w, r, route)
}

func (p *Proxy) handleKeyed(ctx context.Context, w http.ResponseWriter, r *http.Request, route Route) {
	start := time.Now()
	entry := logEntry{
		TS:        start.UnixMilli(),
		KeyPrefix: "-",
		Method:    r.Method,
		Path:      r.URL.Path,
	}
	defer func() {
		entry.LatencyMS = time.Since(start).Milliseconds()
		p.recordLog(route.ServiceID, entry)
	}()

	reject := func(code int, msg string) {
		entry.Status = code
		http.Error(w, msg, code)
	}

	token, ok := bearerToken(r)
	if !ok {
		reject(http.StatusUnauthorized, "missing api key")
		return
	}

	key, found, err := lookup[Key](ctx, p.rdb, p.keys, "key:"+hashKey(token))
	if err != nil {
		log.Printf("resolve key: %v", err)
		reject(http.StatusBadGateway, "upstream lookup failed")
		return
	}
	if !found || key.ServiceID != route.ServiceID {
		reject(http.StatusUnauthorized, "invalid api key")
		return
	}
	entry.KeyPrefix = key.Prefix
	if key.ExpiresAt != nil && time.Now().UnixMilli() > *key.ExpiresAt {
		reject(http.StatusUnauthorized, "invalid api key")
		return
	}

	plan, found, err := lookup[Plan](ctx, p.rdb, p.plans, "plan:"+key.PlanID)
	if err != nil || !found {
		// a key without its plan means the sync is broken — resync heals it
		log.Printf("plan %s missing for key %s: %v", key.PlanID, key.KeyID, err)
		reject(http.StatusBadGateway, "upstream lookup failed")
		return
	}

	status, err := p.billingStatus(ctx, route.OrganizationID)
	if err != nil {
		log.Printf("billing %s: %v", route.OrganizationID, err)
		reject(http.StatusBadGateway, "upstream lookup failed")
		return
	}
	if status != "active" {
		reject(http.StatusPaymentRequired, "publisher subscription inactive")
		return
	}

	rl := p.allow(ctx, key.KeyID, plan)
	w.Header().Set("X-RateLimit-Limit", strconv.Itoa(plan.RPS))
	w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(rl.remaining))
	if rl.quotaExceeded {
		reject(http.StatusTooManyRequests, "monthly quota exceeded")
		return
	}
	if !rl.allowed {
		w.Header().Set("Retry-After", "1")
		reject(http.StatusTooManyRequests, "rate limit exceeded")
		return
	}

	target, err := url.Parse(route.OriginURL)
	if err != nil {
		reject(http.StatusInternalServerError, "bad origin")
		return
	}

	r.Header.Del("Authorization")
	r.Header.Set("X-Gateway-Secret", p.cfg.GatewaySecret)

	rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
	proxyStart := time.Now()
	httputil.NewSingleHostReverseProxy(target).ServeHTTP(rec, r)
	entry.Status = rec.status
	p.recordUsage(key.KeyID, rec.status, time.Since(proxyStart))
}

func (p *Proxy) forward(w http.ResponseWriter, r *http.Request, origin string) {
	target, err := url.Parse(origin)
	if err != nil {
		http.Error(w, "bad origin", http.StatusInternalServerError)
		return
	}
	httputil.NewSingleHostReverseProxy(target).ServeHTTP(w, r)
}
