package utils

import (
	"net"
	"strings"
)

// HostKey extracts the routing key from a Host header:
// "acme.localhost:8080" + domain "localhost" -> "acme".
// Single labels only; the bare domain and nested subdomains don't route.
func HostKey(host, gatewayDomain string) (string, bool) {
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	key, found := strings.CutSuffix(host, "."+gatewayDomain)
	if !found || key == "" || strings.Contains(key, ".") {
		return "", false
	}
	return key, true
}

func ResolveLocalHost(host string) (string, bool) {
	hosts := map[string]string{"foo.localhost": "http://localhost:9000"}
	// strip the port: "foo.localhost:8080" -> "foo.localhost"
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	origin, ok := hosts[host]
	return origin, ok
}
