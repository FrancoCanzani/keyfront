package proxy

import (
	"errors"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/francocanzani/keyfront/internal/resolver"
	"github.com/francocanzani/keyfront/internal/store"
)

func New(target *url.URL, secret string) *httputil.ReverseProxy {
	return &httputil.ReverseProxy{
		// Rewrite runs per request, shaping the outbound request before it is sent upstream.
		//   SetURL: point the request at the resolved upstream (scheme, host, path).
		//   SetXForwarded: forward the original caller's IP, host, and scheme as X-Forwarded-* headers.
		//   Out.Host: send the upstream's own Host, not the client's, so third-party APIs accept it.
		//   X-Gateway-Secret: strip any client-supplied value, then inject ours so the origin
		//     can verify the request actually came through the gateway.
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(target)
			pr.SetXForwarded()
			pr.Out.Host = target.Host
			pr.Out.Header.Del("X-Gateway-Secret")
			if secret != "" {
				pr.Out.Header.Set("X-Gateway-Secret", secret)
			}
		},

		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("proxy error: host=%s err=%v", target.Host, err)
			w.WriteHeader(http.StatusBadGateway)
			w.Write([]byte("upstream unavailable"))
		},
	}
}

func Handler(cache *store.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		target, secret, err := resolver.Resolve(r.Context(), cache, r.Host)
		if errors.Is(err, resolver.ErrNoRoute) {
			http.Error(w, "no route for host", http.StatusNotFound)
			return
		}
		if err != nil {
			log.Printf("resolve error: host=%s err=%v", r.Host, err)
			http.Error(w, "resolver error", http.StatusInternalServerError)
			return
		}

		New(target, secret).ServeHTTP(w, r)
	}
}
