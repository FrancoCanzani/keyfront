package main

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/francocanzani/api-gateway/internal/cache"
	"github.com/francocanzani/api-gateway/internal/config"
	"github.com/francocanzani/api-gateway/internal/proxy"
	"github.com/francocanzani/api-gateway/internal/store"
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

	p := proxy.New(cfg, db)

	r.HandleFunc("/*", p.Handle)

	log.Printf("gateway listening on %s", cfg.Addr)

	if err := http.ListenAndServe(cfg.Addr, r); err != nil {
		log.Fatal(err)
	}
}
