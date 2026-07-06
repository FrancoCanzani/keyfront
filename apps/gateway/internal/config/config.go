package config

import "os"

type Config struct {
	IsProd  bool
	IsDev   bool
	Address string
	Env     string
}

func Get() Config {
	env := os.Getenv("ENV")
	isProd := env == "production"

	address := os.Getenv("ADDR")
	if address == "" {
		address = ":8080"
	}

	return Config{
		IsProd:  isProd,
		IsDev:   !isProd,
		Address: address,
		Env:     env,
	}
}
