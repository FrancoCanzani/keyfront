package proxy

import (
	"context"
	"encoding/json"
	"log"
	"time"
)

type logEntry struct {
	TS        int64  `json:"ts"`
	ServiceID string `json:"serviceId"`
	KeyID     string `json:"keyId,omitempty"`
	KeyPrefix string `json:"keyPrefix"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	Status    int    `json:"status"`
	Outcome   string `json:"outcome"`
	Region    string `json:"region,omitempty"`
	UserAgent string `json:"userAgent,omitempty"`
	LatencyMS int64  `json:"ms"`
}

// ring buffer of the last 100 requests per service for the live view, plus
// the logq queue drained into postgres by apps/web/src/server/lib/log-drain.ts
// — keep shapes in lockstep
func (p *Proxy) recordLog(serviceID string, entry logEntry) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	entry.ServiceID = serviceID
	raw, err := json.Marshal(entry)
	if err != nil {
		return
	}
	listKey := "log:" + serviceID
	pipe := p.rdb.Pipeline()
	pipe.LPush(ctx, listKey, raw)
	pipe.LTrim(ctx, listKey, 0, 99)
	pipe.Expire(ctx, listKey, 24*time.Hour)
	pipe.RPush(ctx, "logq", raw)
	pipe.LTrim(ctx, "logq", -50_000, -1)
	if _, err := pipe.Exec(ctx); err != nil {
		log.Printf("log %s: %v", serviceID, err)
	}
}
