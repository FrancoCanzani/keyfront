package proxy

import (
	"context"
	"errors"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/francocanzani/api-gateway/internal/config"
	"github.com/francocanzani/api-gateway/internal/store"
	"github.com/francocanzani/api-gateway/internal/utils"
)

type Proxy struct {
	cfg   config.Config
	store *store.Store
}

func New(cfg config.Config, store *store.Store) *Proxy {
	return &Proxy{cfg: cfg, store: store}
}

func (p *Proxy) Handle(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	key, ok := utils.HostKey(r.Host, p.cfg.GatewayDomain)
	if !ok {
		http.Error(w, "unknown host", http.StatusNotFound)
		return
	}

	origin, err := p.store.OriginForHostKey(ctx, key)
	switch {
	case errors.Is(err, store.ErrNotFound):
		// dev keeps the static map as a fallback so foo.localhost works with zero rows
		if !p.cfg.IsDev() {
			http.Error(w, "unknown host", http.StatusNotFound)
			return
		}
		origin, ok = utils.ResolveLocalHost(r.Host)
		if !ok {
			http.Error(w, "unknown host", http.StatusNotFound)
			return
		}
	case err != nil:
		log.Printf("resolve %s: %v", key, err)
		http.Error(w, "upstream lookup failed", http.StatusBadGateway)
		return
	}

	target, err := url.Parse(origin)
	if err != nil {
		http.Error(w, "bad origin", http.StatusInternalServerError)
		return
	}

	httputil.NewSingleHostReverseProxy(target).ServeHTTP(w, r)
}
