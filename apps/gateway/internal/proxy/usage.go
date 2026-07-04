package proxy

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"
)

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// fields drained by apps/web/src/server/usage-drain.ts
func (p *Proxy) recordUsage(keyID string, status int, elapsed time.Duration) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	window := time.Now().Truncate(time.Minute).UnixMilli()
	usageKey := fmt.Sprintf("usage:%s:%d", keyID, window)

	class := "ok"
	switch {
	case status >= 500:
		class = "err5"
	case status >= 400:
		class = "err4"
	}

	pipe := p.rdb.Pipeline()
	pipe.HIncrBy(ctx, usageKey, "count", 1)
	pipe.HIncrBy(ctx, usageKey, class, 1)
	pipe.HIncrBy(ctx, usageKey, "lat_sum", elapsed.Milliseconds())
	pipe.Expire(ctx, usageKey, 24*time.Hour)
	if _, err := pipe.Exec(ctx); err != nil {
		log.Printf("usage %s: %v", keyID, err)
	}
}
