package cache

import (
	"sync"
	"time"
)

type entry[V any] struct {
	value     V
	expiresAt time.Time
}

// expiry checked on read; no sweeper — size is bounded by config rows
type TTL[V any] struct {
	mu      sync.RWMutex
	entries map[string]entry[V]
}

func NewTTL[V any]() *TTL[V] {
	return &TTL[V]{entries: make(map[string]entry[V])}
}

func (c *TTL[V]) Get(key string) (V, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	e, ok := c.entries[key]
	if !ok || time.Now().After(e.expiresAt) {
		var zero V
		return zero, false
	}
	return e.value, true
}

func (c *TTL[V]) Set(key string, value V, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries[key] = entry[V]{value: value, expiresAt: time.Now().Add(ttl)}
}

func (c *TTL[V]) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.entries, key)
}
