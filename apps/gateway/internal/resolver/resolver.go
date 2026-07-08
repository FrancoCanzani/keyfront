package resolver

import (
	"context"
	"errors"
	"net"
	"net/url"

	"github.com/redis/go-redis/v9"

	"github.com/francocanzani/keyfront/internal/store"
)

var ErrNoRoute = errors.New("no route for host")

func Resolve(ctx context.Context, rdb *redis.Client, host string) (*url.URL, error) {
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}

	route, err := store.Get(ctx, rdb, host)
	if errors.Is(err, redis.Nil) {
		return nil, ErrNoRoute
	}
	if err != nil {
		return nil, err
	}

	return url.Parse(route.Upstream)
}
