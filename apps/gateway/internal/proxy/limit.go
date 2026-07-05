package proxy

import (
	"context"
	"fmt"
	"log"
	"time"
)

type limitResult struct {
	allowed       bool
	remaining     int
	quotaExceeded bool
	quotaUsed     int64
}

// fixed 1s windows: INCR is atomic without lua; can burst up to 2x rps at
// window boundaries — token bucket later if that matters
func (p *Proxy) allow(ctx context.Context, keyID string, rps int, monthlyQuota *int64) limitResult {
	now := time.Now()
	rlKey := fmt.Sprintf("rl:%s:%d", keyID, now.Unix())

	pipe := p.rdb.Pipeline()
	count := pipe.Incr(ctx, rlKey)
	pipe.Expire(ctx, rlKey, 2*time.Second)
	if _, err := pipe.Exec(ctx); err != nil {
		log.Printf("rate limit %s: %v", keyID, err)
		return limitResult{allowed: true, remaining: rps} // fail open
	}
	used := int(count.Val())
	if used > rps {
		return limitResult{}
	}
	result := limitResult{allowed: true, remaining: rps - used}

	if monthlyQuota != nil {
		quotaKey := "quota:" + keyID + ":" + now.Format("200601")
		pipe := p.rdb.Pipeline()
		total := pipe.Incr(ctx, quotaKey)
		pipe.ExpireNX(ctx, quotaKey, 40*24*time.Hour)
		if _, err := pipe.Exec(ctx); err != nil {
			log.Printf("quota %s: %v", keyID, err)
			return result
		}
		result.quotaUsed = total.Val()
		if result.quotaUsed > *monthlyQuota {
			return limitResult{quotaExceeded: true, quotaUsed: result.quotaUsed}
		}
	}
	return result
}
