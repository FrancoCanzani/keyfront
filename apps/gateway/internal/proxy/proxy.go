package proxy

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/francocanzani/keyfront/internal/cache"
	"github.com/francocanzani/keyfront/internal/config"
	"github.com/francocanzani/keyfront/internal/utils"
)

const (
	maxBodyBytes    = 10 << 20
	failsPerMinute  = 60
	ipBlockDuration = 30 * time.Second
)

const (
	outcomeValid           = "VALID"
	outcomeMissingKey      = "MISSING_KEY"
	outcomeInvalidKey      = "INVALID_KEY"
	outcomeExpired         = "EXPIRED"
	outcomeForbiddenIP     = "FORBIDDEN_IP"
	outcomeThrottledIP     = "THROTTLED_IP"
	outcomeRateLimited     = "RATE_LIMITED"
	outcomeQuotaExceeded   = "QUOTA_EXCEEDED"
	outcomePaymentRequired = "PAYMENT_REQUIRED"
	outcomeUpstreamError   = "UPSTREAM_ERROR"
)

type Proxy struct {
	cfg        config.Config
	rdb        *redis.Client
	routes     *cache.TTL[Route]
	keys       *cache.TTL[Key]
	plans      *cache.TTL[Plan]
	billing    *cache.TTL[string]
	blockedIPs *cache.TTL[struct{}]
}

func New(cfg config.Config, rdb *redis.Client) *Proxy {
	return &Proxy{
		cfg:        cfg,
		rdb:        rdb,
		routes:     cache.NewTTL[Route](),
		keys:       cache.NewTTL[Key](),
		plans:      cache.NewTTL[Plan](),
		billing:    cache.NewTTL[string](),
		blockedIPs: cache.NewTTL[struct{}](),
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
	ip := clientIP(r)
	entry := logEntry{
		TS:        start.UnixMilli(),
		KeyPrefix: "-",
		Method:    r.Method,
		Path:      r.URL.Path,
		Region:    r.Header.Get("Fly-Region"),
		UserAgent: truncate(r.UserAgent(), 200),
	}
	logIt := true
	defer func() {
		if logIt {
			entry.LatencyMS = time.Since(start).Milliseconds()
			p.recordLog(route.ServiceID, entry)
		}
	}()

	reject := func(code int, outcome, msg string) {
		entry.Status = code
		entry.Outcome = outcome
		http.Error(w, msg, code)
	}
	authFail := func(code int, outcome, msg string) {
		p.recordAuthFailure(ctx, ip)
		reject(code, outcome, msg)
	}

	if _, blocked := p.blockedIPs.Get(ip); blocked {
		w.Header().Set("Retry-After", "30")
		reject(http.StatusTooManyRequests, outcomeThrottledIP, "too many failed requests")
		return
	}

	token, ok := bearerToken(r)
	if !ok {
		authFail(http.StatusUnauthorized, outcomeMissingKey, "missing api key")
		return
	}

	key, found, err := lookup[Key](ctx, p.rdb, p.keys, "key:"+hashKey(token))
	if err != nil {
		log.Printf("resolve key: %v", err)
		reject(http.StatusBadGateway, outcomeUpstreamError, "upstream lookup failed")
		return
	}
	if !found || key.ServiceID != route.ServiceID {
		authFail(http.StatusUnauthorized, outcomeInvalidKey, "invalid api key")
		return
	}
	entry.KeyPrefix = key.Prefix
	entry.KeyID = key.KeyID
	if key.ExpiresAt != nil && time.Now().UnixMilli() > *key.ExpiresAt {
		authFail(http.StatusUnauthorized, outcomeExpired, "invalid api key")
		return
	}
	if len(key.IPAllowlist) > 0 && !slices.Contains(key.IPAllowlist, ip) {
		reject(http.StatusForbidden, outcomeForbiddenIP, "ip not allowed")
		return
	}

	plan, found, err := lookup[Plan](ctx, p.rdb, p.plans, "plan:"+key.PlanID)
	if err != nil || !found {
		// a key without its plan means the sync is broken — resync heals it
		log.Printf("plan %s missing for key %s: %v", key.PlanID, key.KeyID, err)
		reject(http.StatusBadGateway, outcomeUpstreamError, "upstream lookup failed")
		return
	}

	if r.Method == http.MethodGet && r.URL.Path == "/_keyfront/usage" {
		logIt = false
		p.serveUsage(ctx, w, key, plan)
		return
	}

	status, err := p.billingStatus(ctx, route.OrganizationID)
	if err != nil {
		log.Printf("billing %s: %v", route.OrganizationID, err)
		reject(http.StatusBadGateway, outcomeUpstreamError, "upstream lookup failed")
		return
	}
	if status != "active" {
		reject(http.StatusPaymentRequired, outcomePaymentRequired, "publisher subscription inactive")
		return
	}

	rps := plan.RPS
	if key.RPS != nil {
		rps = *key.RPS
	}
	rl := p.allow(ctx, key.KeyID, rps, plan.MonthlyQuota)
	w.Header().Set("X-RateLimit-Limit", strconv.Itoa(rps))
	w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(rl.remaining))
	if plan.MonthlyQuota != nil {
		quota := *plan.MonthlyQuota
		w.Header().Set("X-Quota-Limit", strconv.FormatInt(quota, 10))
		w.Header().Set("X-Quota-Remaining", strconv.FormatInt(max(0, quota-rl.quotaUsed), 10))
		w.Header().Set("X-Quota-Reset", firstOfNextMonth().Format(time.RFC3339))
	}
	if rl.quotaExceeded {
		reject(http.StatusTooManyRequests, outcomeQuotaExceeded, "monthly quota exceeded")
		return
	}
	if !rl.allowed {
		w.Header().Set("Retry-After", "1")
		reject(http.StatusTooManyRequests, outcomeRateLimited, "rate limit exceeded")
		return
	}

	target, err := url.Parse(route.OriginURL)
	if err != nil {
		reject(http.StatusInternalServerError, outcomeUpstreamError, "bad origin")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	r.Header.Del("Authorization")
	r.Header.Set("X-Gateway-Secret", p.cfg.GatewaySecret)

	rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
	proxyStart := time.Now()
	httputil.NewSingleHostReverseProxy(target).ServeHTTP(rec, r)
	entry.Status = rec.status
	entry.Outcome = outcomeValid
	p.recordUsage(key.KeyID, rec.status, time.Since(proxyStart))
}

// key-authenticated introspection on a reserved path; not rate limited,
// metered, or logged
func (p *Proxy) serveUsage(ctx context.Context, w http.ResponseWriter, key Key, plan Plan) {
	now := time.Now().UTC()
	var used int64
	if plan.MonthlyQuota != nil {
		used, _ = p.rdb.Get(ctx, "quota:"+key.KeyID+":"+now.Format("200601")).Int64()
	}
	rps := plan.RPS
	if key.RPS != nil {
		rps = *key.RPS
	}
	var remaining *int64
	if plan.MonthlyQuota != nil {
		left := max(0, *plan.MonthlyQuota-used)
		remaining = &left
	}
	var expiresAt *string
	if key.ExpiresAt != nil {
		formatted := time.UnixMilli(*key.ExpiresAt).UTC().Format(time.RFC3339)
		expiresAt = &formatted
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"keyPrefix":     key.Prefix,
		"environment":   key.Environment,
		"rps":           rps,
		"monthlyQuota":  plan.MonthlyQuota,
		"usedThisMonth": used,
		"remaining":     remaining,
		"resetsAt":      firstOfNextMonth().Format(time.RFC3339),
		"expiresAt":     expiresAt,
	})
}

// after failsPerMinute auth failures an ip is served 429s from memory;
// redis errors fail open like the rate limiter
func (p *Proxy) recordAuthFailure(ctx context.Context, ip string) {
	window := time.Now().Unix() / 60
	failKey := "ipfail:" + ip + ":" + strconv.FormatInt(window, 10)

	pipe := p.rdb.Pipeline()
	count := pipe.Incr(ctx, failKey)
	pipe.Expire(ctx, failKey, 2*time.Minute)
	if _, err := pipe.Exec(ctx); err != nil {
		log.Printf("auth failure %s: %v", ip, err)
		return
	}
	if count.Val() > failsPerMinute {
		p.blockedIPs.Set(ip, struct{}{}, ipBlockDuration)
	}
}

func (p *Proxy) forward(w http.ResponseWriter, r *http.Request, origin string) {
	target, err := url.Parse(origin)
	if err != nil {
		http.Error(w, "bad origin", http.StatusInternalServerError)
		return
	}
	httputil.NewSingleHostReverseProxy(target).ServeHTTP(w, r)
}

// Fly-Client-IP is set by fly's edge; XFF and RemoteAddr are dev fallbacks
func clientIP(r *http.Request) string {
	if ip := r.Header.Get("Fly-Client-IP"); ip != "" {
		return ip
	}
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		first, _, _ := strings.Cut(xff, ",")
		return strings.TrimSpace(first)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func firstOfNextMonth() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, time.UTC)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
