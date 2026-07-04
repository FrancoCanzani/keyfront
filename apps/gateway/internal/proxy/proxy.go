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

	"github.com/francocanzani/api-gateway/internal/cache"
	"github.com/francocanzani/api-gateway/internal/config"
	"github.com/francocanzani/api-gateway/internal/utils"
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
		route = Route{OriginURL: origin}
	}

	// static-map routes have no service and therefore no keys — dev only
	if route.ServiceID != "" {
		token, ok := bearerToken(r)
		if !ok {
			http.Error(w, "missing api key", http.StatusUnauthorized)
			return
		}

		key, found, err := lookup[Key](ctx, p.rdb, p.keys, "key:"+hashKey(token))
		if err != nil {
			log.Printf("resolve key: %v", err)
			http.Error(w, "upstream lookup failed", http.StatusBadGateway)
			return
		}
		if !found || key.ServiceID != route.ServiceID {
			http.Error(w, "invalid api key", http.StatusUnauthorized)
			return
		}

		plan, found, err := lookup[Plan](ctx, p.rdb, p.plans, "plan:"+key.PlanID)
		if err != nil || !found {
			// a key without its plan means the sync is broken — resync heals it
			log.Printf("plan %s missing for key %s: %v", key.PlanID, key.KeyID, err)
			http.Error(w, "upstream lookup failed", http.StatusBadGateway)
			return
		}

		status, err := p.billingStatus(ctx, route.OrganizationID)
		if err != nil {
			log.Printf("billing %s: %v", route.OrganizationID, err)
			http.Error(w, "upstream lookup failed", http.StatusBadGateway)
			return
		}
		if status != "active" {
			http.Error(w, "publisher subscription inactive", http.StatusPaymentRequired)
			return
		}

		rl := p.allow(ctx, key.KeyID, plan)
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(plan.RPS))
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(rl.remaining))
		if rl.quotaExceeded {
			http.Error(w, "monthly quota exceeded", http.StatusTooManyRequests)
			return
		}
		if !rl.allowed {
			w.Header().Set("Retry-After", "1")
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		target, err := url.Parse(route.OriginURL)
		if err != nil {
			http.Error(w, "bad origin", http.StatusInternalServerError)
			return
		}

		r.Header.Del("Authorization")
		r.Header.Set("X-Gateway-Secret", p.cfg.GatewaySecret)

		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		start := time.Now()
		httputil.NewSingleHostReverseProxy(target).ServeHTTP(rec, r)
		p.recordUsage(key.KeyID, rec.status, time.Since(start))
		return
	}

	target, err := url.Parse(route.OriginURL)
	if err != nil {
		http.Error(w, "bad origin", http.StatusInternalServerError)
		return
	}

	httputil.NewSingleHostReverseProxy(target).ServeHTTP(w, r)
}
