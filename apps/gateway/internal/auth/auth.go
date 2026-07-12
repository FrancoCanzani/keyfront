package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"

	"github.com/redis/go-redis/v9"

	"github.com/francocanzani/keyfront/internal/store"
)

var (
	ErrNoKey        = errors.New("missing or unknown api key")
	ErrRevoked      = errors.New("api key revoked")
	ErrWrongService = errors.New("api key not valid for this service")
)

// Must match hashApiKey in apps/web/src/backend/lib/keys.ts: sha256 over the
// full plaintext, lowercase hex.
func HashKey(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}

func Authenticate(ctx context.Context, rdb *redis.Client, header, serviceID string) (store.Key, error) {
	token, ok := strings.CutPrefix(header, "Bearer ")
	if !ok || token == "" {
		return store.Key{}, ErrNoKey
	}

	key, err := store.GetKey(ctx, rdb, HashKey(token))
	if errors.Is(err, redis.Nil) {
		return store.Key{}, ErrNoKey
	}
	if err != nil {
		return store.Key{}, err
	}

	if key.Status != "active" {
		return store.Key{}, ErrRevoked
	}
	if key.ServiceID != serviceID {
		return store.Key{}, ErrWrongService
	}

	return key, nil
}
