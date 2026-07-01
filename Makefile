.PHONY: dev dev-go dev-web migrate migrate-down sqlc build

GOBIN := $(shell go env GOPATH)/bin
DATABASE_URL ?= postgres://localhost/api_gateway
BACKEND := apps/backend

dev:
	$(MAKE) -j2 dev-go dev-web

dev-go:
	cd $(BACKEND) && $(GOBIN)/air

dev-web:
	bun run dev

migrate:
	cd $(BACKEND) && $(GOBIN)/goose -dir db/migrations postgres "$(DATABASE_URL)" up

migrate-down:
	cd $(BACKEND) && $(GOBIN)/goose -dir db/migrations postgres "$(DATABASE_URL)" down

sqlc:
	cd $(BACKEND) && $(GOBIN)/sqlc generate

build:
	cd $(BACKEND) && go build ./...
