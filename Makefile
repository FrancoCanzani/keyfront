.PHONY: dev dev-gateway dev-control build generate migrate

GOBIN := $(shell go env GOPATH)/bin

# Run the Go data plane + the control plane (Vite + Hono) together.
dev:
	$(MAKE) -j2 dev-gateway dev-control

dev-gateway:
	cd apps/gateway && $(GOBIN)/air

dev-control:
	cd apps/control && bun run dev

build:
	cd apps/gateway && go build ./...

# Schema is owned by the control plane (Drizzle); the Go data plane reads it.
generate:
	cd apps/control && bun run db:generate

migrate:
	cd apps/control && bun run db:migrate
