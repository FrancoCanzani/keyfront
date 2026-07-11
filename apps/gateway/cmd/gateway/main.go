package main

import (
	"context"
	"log"
	"net/http"

	"github.com/francocanzani/keyfront/internal/config"
	"github.com/francocanzani/keyfront/internal/proxy"
	"github.com/francocanzani/keyfront/internal/redis"
	"github.com/francocanzani/keyfront/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	cfg := config.Get()

	rdb := redis.New()
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("redis: %v", err)
	}
	log.Println("redis connected")

	router := chi.NewRouter()
	router.Use(middleware.Logger)

	router.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("hi"))
	})

	cache := store.NewCache(rdb)
	router.Handle("/*", proxy.Handler(cache))

	log.Printf("gateway listening on %s", cfg.Address)
	if err := http.ListenAndServe(cfg.Address, router); err != nil {
		log.Fatalf("serve: %v", err)
	}
}
