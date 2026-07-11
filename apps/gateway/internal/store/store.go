package store

import (
	"context"
	"encoding/json"

	"github.com/redis/go-redis/v9"
)

type Route struct {
	Host     string `json:"host"`
	Upstream string `json:"upstream"`
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
