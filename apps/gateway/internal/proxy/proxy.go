package proxy

import (
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/francocanzani/keyfront/internal/resolver"
)

func New(target *url.URL) *httputil.ReverseProxy {
	return &httputil.ReverseProxy{
		// Rewrite runs per request, shaping the outbound request before it is sent upstream.
		//   SetURL: point the request at the resolved upstream (scheme, host, path).
		//   SetXForwarded: forward the original caller's IP, host, and scheme as X-Forwarded-* headers.
		//   Out.Host: send the upstream's own Host, not the client's, so third-party APIs accept it.
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(target)
			pr.SetXForwarded()
			pr.Out.Host = target.Host
		},
	}
}

func Handler(w http.ResponseWriter, r *http.Request) {
	target, err := resolver.Resolve(r.Host)

	if err != nil {
		http.Error(w, "no route for host", http.StatusNotFound)
		return
	}

	New(target).ServeHTTP(w, r)
}
