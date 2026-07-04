package proxy

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
)

func bearerToken(r *http.Request) (string, bool) {
	token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !ok || !strings.HasPrefix(token, "gw_live_") {
		return "", false
	}
	return token, true
}

func hashKey(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
