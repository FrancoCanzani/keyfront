package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Addr        string
	DatabaseURL string
	RedisURL    string
}

func Load() Config {
	// gateway runs from ./apps/backend, so also try the repo-root .env
	_ = godotenv.Load()
	_ = godotenv.Load("../../.env")

	return Config{
		Addr:        getenv("ADDR", ":8080"),
		DatabaseURL: getenv("DATABASE_URL", "postgres://localhost/api_gateway"),
		RedisURL:    getenv("REDIS_URL", "redis://localhost:6379"),
	}
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
