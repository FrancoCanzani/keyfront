package store

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/redis/go-redis/v9"
)

type Route struct {
	Host     string `json:"host"`
	Upstream string `json:"upstream"`
}

type Cache struct {
	rdb    *redis.Client
	mu     sync.RWMutex
	routes map[string]Route
}

func NewCache(rdb *redis.Client) *Cache {
	return &Cache{
		rdb:    rdb,
		routes: make(map[string]Route),
	}
}

func (c *Cache) Get(ctx context.Context, host string) (Route, error) {

	c.mu.RLock()

	route, ok := c.routes[host]

	c.mu.RUnlock()

	if ok {
		return route, nil
	}

	route, err := Get(ctx, c.rdb, host)
	if err != nil {
		return Route{}, err
	}

	c.mu.Lock()

	c.routes[host] = route

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
