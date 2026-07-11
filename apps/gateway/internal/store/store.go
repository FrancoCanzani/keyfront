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
	Host     string `json:"host"`
	Upstream string `json:"upstream"`
	Secret   string `json:"secret"`
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
