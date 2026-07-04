package proxy

import (
	"context"
	"encoding/json"
	"log"
	"time"
)

type logEntry struct {
	TS        int64  `json:"ts"`
	KeyPrefix string `json:"keyPrefix"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	Status    int    `json:"status"`
	LatencyMS int64  `json:"ms"`
}

// ring buffer of the last 100 requests per service, read by the dashboard
func (p *Proxy) recordLog(serviceID string, entry logEntry) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	raw, err := json.Marshal(entry)
	if err != nil {
		return
	}
	listKey := "log:" + serviceID
	pipe := p.rdb.Pipeline()
	pipe.LPush(ctx, listKey, raw)
	pipe.LTrim(ctx, listKey, 0, 99)
	pipe.Expire(ctx, listKey, 24*time.Hour)
	if _, err := pipe.Exec(ctx); err != nil {
		log.Printf("log %s: %v", serviceID, err)
	}
}
