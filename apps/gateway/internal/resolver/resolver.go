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

func Resolve(ctx context.Context, cache *store.Cache, host string) (*url.URL, store.Route, error) {
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}

	route, err := cache.Get(ctx, host)
	if errors.Is(err, redis.Nil) {
		return nil, store.Route{}, ErrNoRoute
	}
	if err != nil {
		return nil, store.Route{}, err
	}

	target, err := url.Parse(route.Upstream)
	if err != nil {
		return nil, store.Route{}, err
	}

	return target, route, nil
}
