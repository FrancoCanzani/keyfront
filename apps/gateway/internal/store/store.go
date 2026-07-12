package store

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const routeTTL = 30 * time.Second

type Route struct {
	Host      string `json:"host"`
	Upstream  string `json:"upstream"`
	Secret    string `json:"secret"`
	ServiceID string `json:"service_id"`
}

type entry struct {
	route     Route
	fetchedAt time.Time
}

type Cache struct {
	rdb    *redis.Client
	mu     sync.RWMutex
	ttl    time.Duration
	routes map[string]entry
}

func NewCache(rdb *redis.Client) *Cache {
	return &Cache{
		rdb:    rdb,
		ttl:    routeTTL,
		routes: make(map[string]entry),
	}
}

func (c *Cache) Get(ctx context.Context, host string) (Route, error) {
	c.mu.RLock()
	e, ok := c.routes[host]
	c.mu.RUnlock()

	if ok && time.Since(e.fetchedAt) < c.ttl {
		return e.route, nil
	}

	route, err := Get(ctx, c.rdb, host)
	if err != nil {
		return Route{}, err
	}

	c.mu.Lock()
	c.routes[host] = entry{route: route, fetchedAt: time.Now()}
	c.mu.Unlock()

	return route, nil
}

func Get(ctx context.Context, rdb *redis.Client, host string) (Route, error) {
	var route Route

	data, err := rdb.Get(ctx, "route:"+host).Bytes()
	if err != nil {
		return route, err
	}

	if err := json.Unmarshal(data, &route); err != nil {
		return route, err
	}

	return route, nil
}

type Key struct {
	ID             string `json:"id"`
	OrganizationID string `json:"organization_id"`
	IdentityID     string `json:"identity_id"`
	ServiceID      string `json:"service_id"`
	PlanID         string `json:"plan_id"`
	Environment    string `json:"environment"`
	Status         string `json:"status"`
}

// Keys are read straight from Redis on every request, never cached in memory,
// so a revoke takes effect on the next request.
func GetKey(ctx context.Context, rdb *redis.Client, hash string) (Key, error) {
	var key Key

	data, err := rdb.Get(ctx, "key:"+hash).Bytes()
	if err != nil {
		return key, err
	}

	if err := json.Unmarshal(data, &key); err != nil {
		return key, err
	}

	return key, nil
}

type Plan struct {
	RateLimit    int   `json:"rate_limit"`
	Burst        int   `json:"burst"`
	MonthlyQuota int64 `json:"monthly_quota"`
}

func GetPlan(ctx context.Context, rdb *redis.Client, planID string) (Plan, error) {
	var plan Plan

	data, err := rdb.Get(ctx, "plan:"+planID).Bytes()
	if err != nil {
		return plan, err
	}

	if err := json.Unmarshal(data, &plan); err != nil {
		return plan, err
	}

	return plan, nil
}
