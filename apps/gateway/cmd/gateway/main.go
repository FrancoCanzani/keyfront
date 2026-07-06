package main

import (
	"log"
	"net/http"

	"github.com/francocanzani/keyfront/internal/config"
	"github.com/francocanzani/keyfront/internal/proxy"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	cfg := config.Get()
	router := chi.NewRouter()
	router.Use(middleware.Logger)

	router.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("hi"))
	})

	router.Handle("/*", http.HandlerFunc(proxy.Handler))

	if err := http.ListenAndServe(cfg.Address, router); err != nil {
		log.Fatalf("serve: %v", err)
	}
}
