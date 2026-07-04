package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Addr          string
	RedisURL      string
	Env           string
	GatewayDomain string
}

func Load() Config {
	// gateway runs from ./apps/gateway, so also try the repo-root .env
	_ = godotenv.Load()
	_ = godotenv.Load("../../.env")

	return Config{
		Addr:          getenv("ADDR", ":8080"),
		RedisURL:      getenv("REDIS_URL", "redis://localhost:6379"),
		Env:           getenv("ENV", "development"),
		GatewayDomain: getenv("GATEWAY_DOMAIN", "localhost"),
	}
}

func (c Config) IsDev() bool  { return c.Env != "production" }
func (c Config) IsProd() bool { return c.Env == "production" }

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
