package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/francocanzani/api-gateway/internal/cache"
	"github.com/francocanzani/api-gateway/internal/config"
	"github.com/francocanzani/api-gateway/internal/store"
	"github.com/francocanzani/api-gateway/internal/utils"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	db, err := store.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("postgres: %v", err)
	}
	defer db.Close()

	rdb, err := cache.NewRedis(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	defer func() { _ = rdb.Close() }()

	r := chi.NewRouter()
	r.Use(middleware.Logger)

	r.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println(r.Host)

		var origin string
		var ok bool
		if cfg.IsDev() {
			origin, ok = utils.ResolveLocalHost(r.Host)
		} else {
			// Slice 2: origin, ok = utils.ResolveHost(ctx, db, r.Host)
			http.Error(w, "not implemented", http.StatusNotImplemented)
			return
		}

		if !ok {
			http.Error(w, "unknown host", http.StatusNotFound)
			return
		}

		target, err := url.Parse(origin)
		if err != nil {
			http.Error(w, "bad origin", http.StatusInternalServerError)
			return
		}

		proxy := httputil.NewSingleHostReverseProxy(target)
		proxy.ServeHTTP(w, r)
	})

	log.Printf("gateway listening on %s", cfg.Addr)

	if err := http.ListenAndServe(cfg.Addr, r); err != nil {
		log.Fatal(err)
	}
}
