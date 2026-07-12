package proxy

import (
	"context"
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

// Counters outlive their month so the rollup can sweep them after it closes.
const usageTTL = 40 * 24 * time.Hour

func monthlyUsage(ctx context.Context, rdb *redis.Client, keyID string) (int64, error) {
	counter := "usage:" + keyID + ":" + time.Now().UTC().Format("2006-01")

	pipe := rdb.Pipeline()
	incr := pipe.Incr(ctx, counter)
	pipe.ExpireNX(ctx, counter, usageTTL)
	if _, err := pipe.Exec(ctx); err != nil {
		return 0, err
	}

	return incr.Val(), nil
}

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
			pr.Out.Header.Del("X-Keyfront-Host")
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
		// Workerd callers (the dashboard playground) cannot set Host on
		// outbound fetches, so they route via this header instead.
		host := r.Host
		if override := r.Header.Get("X-Keyfront-Host"); override != "" {
			host = override
		}

		target, route, err := resolver.Resolve(r.Context(), cache, host)
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

		if plan.MonthlyQuota > 0 {
			// Quota fails open like the rate limiter; over-quota attempts keep
			// counting, so the rollup must bill min(count, quota).
			used, err := monthlyUsage(r.Context(), rdb, key.ID)
			if err != nil {
				log.Printf("quota error: key=%s err=%v", key.ID, err)
			} else if used > plan.MonthlyQuota {
				http.Error(w, "monthly quota exceeded", http.StatusTooManyRequests)
				return
			}
		}

		New(target, route.Secret).ServeHTTP(w, r)
	}
}
