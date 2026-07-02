package utils

import "net"

func ResolveLocalHost(host string) (string, bool) {
	hosts := map[string]string{"foo.localhost": "http://localhost:9000"}
	// strip the port: "foo.localhost:8080" -> "foo.localhost"
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	origin, ok := hosts[host]
	return origin, ok
}
