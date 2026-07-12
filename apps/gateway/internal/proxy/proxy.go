package proxy

import (
	"errors"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"time"

	"github.com/go-redis/redis_rate/v10"
	"github.com/redis/go-redis/v9"

	"github.com/francocanzani/keyfront/internal/auth"
	"github.com/francocanzani/keyfront/internal/resolver"
	"github.com/francocanzani/keyfront/internal/store"
)

func New(target *url.URL, secret string) *httputil.ReverseProxy {
	return &httputil.ReverseProxy{
		// The origin must receive our secret but never the caller's key or a
		// client-spoofed secret.
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(target)
			pr.SetXForwarded()
			pr.Out.Host = target.Host
			pr.Out.Header.Del("Authorization")
			pr.Out.Header.Del("X-Gateway-Secret")
			if secret != "" {
				pr.Out.Header.Set("X-Gateway-Secret", secret)
			}
		},

		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("proxy error: host=%s err=%v", target.Host, err)
			w.WriteHeader(http.StatusBadGateway)
			w.Write([]byte("upstream unavailable"))
		},
	}
}

func Handler(cache *store.Cache, rdb *redis.Client, limiter *redis_rate.Limiter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		target, route, err := resolver.Resolve(r.Context(), cache, r.Host)
		if errors.Is(err, resolver.ErrNoRoute) {
			http.Error(w, "no route for host", http.StatusNotFound)
			return
		}
		if err != nil {
			log.Printf("resolve error: host=%s err=%v", r.Host, err)
			http.Error(w, "resolver error", http.StatusInternalServerError)
			return
		}

		key, err := auth.Authenticate(r.Context(), rdb, r.Header.Get("Authorization"), route.ServiceID)
		if errors.Is(err, auth.ErrNoKey) || errors.Is(err, auth.ErrRevoked) {
			http.Error(w, "invalid api key", http.StatusUnauthorized)
			return
		}
		if errors.Is(err, auth.ErrWrongService) {
			http.Error(w, "api key not valid for this service", http.StatusForbidden)
			return
		}
		if err != nil {
			// Auth fails closed; rate limiting below fails open.
			log.Printf("auth error: host=%s err=%v", r.Host, err)
			http.Error(w, "auth unavailable", http.StatusServiceUnavailable)
			return
		}

		plan, err := store.GetPlan(r.Context(), rdb, key.PlanID)
		if err != nil {
			log.Printf("plan error: key=%s plan=%s err=%v", key.ID, key.PlanID, err)
			New(target, route.Secret).ServeHTTP(w, r)
			return
		}

		res, err := limiter.Allow(r.Context(), "rl:"+key.ID, redis_rate.Limit{
			Rate:   plan.RateLimit,
			Burst:  plan.Burst,
			Period: time.Second,
		})
		if err != nil {
			log.Printf("ratelimit error: key=%s err=%v", key.ID, err)
			New(target, route.Secret).ServeHTTP(w, r)
			return
		}

		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(plan.RateLimit))
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(res.Remaining))
		w.Header().Set("X-RateLimit-Reset", strconv.Itoa(int(res.ResetAfter.Seconds())))

		if res.Allowed == 0 {
			retryAfter := (res.RetryAfter + time.Second - 1) / time.Second
			w.Header().Set("Retry-After", strconv.Itoa(int(retryAfter)))
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		New(target, route.Secret).ServeHTTP(w, r)
	}
}
