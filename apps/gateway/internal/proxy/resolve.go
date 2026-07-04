package proxy

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/francocanzani/keyfront/internal/cache"
)

const memTTL = 15 * time.Second

// shapes written by apps/web/src/server/sync.ts — keep in lockstep
type Route struct {
	ServiceID      string `json:"serviceId"`
	OrganizationID string `json:"organizationId"`
	OriginURL      string `json:"originUrl"`
}

type Key struct {
	KeyID     string `json:"keyId"`
	ServiceID string `json:"serviceId"`
	PlanID    string `json:"planId"`
	Prefix    string `json:"prefix"`
	ExpiresAt *int64 `json:"expiresAt"`
}

type Plan struct {
	RPS          int    `json:"rps"`
	Burst        int    `json:"burst"`
	MonthlyQuota *int64 `json:"monthlyQuota"`
}

// mem → redis; redis is the source of config, an error has no deeper fallback
func lookup[T any](ctx context.Context, rdb *redis.Client, c *cache.TTL[T], redisKey string) (T, bool, error) {
	var zero T

	if v, ok := c.Get(redisKey); ok {
		return v, true, nil
	}

	raw, err := rdb.Get(ctx, redisKey).Bytes()
	if errors.Is(err, redis.Nil) {
		return zero, false, nil
	}
	if err != nil {
		return zero, false, err
	}

	var v T
	if err := json.Unmarshal(raw, &v); err != nil {
		return zero, false, err
	}

	c.Set(redisKey, v, memTTL)
	return v, true, nil
}

// billing:{orgId} holds a bare status string; missing means active
func (p *Proxy) billingStatus(ctx context.Context, organizationID string) (string, error) {
	redisKey := "billing:" + organizationID

	if v, ok := p.billing.Get(redisKey); ok {
		return v, nil
	}

	status, err := p.rdb.Get(ctx, redisKey).Result()
	if errors.Is(err, redis.Nil) {
		status = "active"
	} else if err != nil {
		return "", err
	}

	p.billing.Set(redisKey, status, memTTL)
	return status, nil
}
