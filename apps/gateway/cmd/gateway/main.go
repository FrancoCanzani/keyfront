package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/francocanzani/api-gateway/internal/cache"
	"github.com/francocanzani/api-gateway/internal/config"
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
	r.Get("/health", healthHandler(db, rdb))

	log.Printf("gateway listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, r); err != nil {
		log.Fatal(err)
	}
}

func healthHandler(db *pgxpool.Pool, rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		ctx, cancel := context.WithTimeout(req.Context(), 2*time.Second)
		defer cancel()

		out := map[string]string{"status": "ok", "postgres": "ok", "redis": "ok"}
		code := http.StatusOK

		if err := db.Ping(ctx); err != nil {
			out["postgres"], out["status"] = "down", "degraded"
			code = http.StatusServiceUnavailable
		}
		if err := rdb.Ping(ctx).Err(); err != nil {
			out["redis"], out["status"] = "down", "degraded"
			code = http.StatusServiceUnavailable
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(code)
		_ = json.NewEncoder(w).Encode(out)
	}
}
