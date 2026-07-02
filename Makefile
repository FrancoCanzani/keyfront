.PHONY: dev dev-gateway dev-web dev-origin build generate migrate

GOBIN := $(shell go env GOPATH)/bin

# Run the Go data plane + control plane + a throwaway test origin together.
dev:
	$(MAKE) -j3 dev-gateway dev-web dev-origin

dev-gateway:
	cd apps/gateway && $(GOBIN)/air

dev-web:
	cd apps/web && bun run dev

# Stand-in upstream on :9000 that echoes what it received (dev only — drop later).
dev-origin:
	python3 scripts/echo-origin.py

build:
	cd apps/gateway && go build ./...

# Schema is owned by the control plane (Drizzle); the Go data plane reads it.
generate:
	cd apps/web && bun run db:generate

migrate:
	cd apps/web && bun run db:migrate
