package resolver

import (
	"errors"
	"net"
	"net/url"

	"github.com/francocanzani/keyfront/internal/store"
)

func Resolve(host string) (*url.URL, error) {
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}

	hosts := store.Map()

	val, exists := hosts[host]

	if !exists {
		return nil, errors.New("host not found")
	}

	parsed, err := url.Parse(val)

	if err != nil {
		return nil, err
	}

	return parsed, nil
}
