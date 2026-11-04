package auth

import (
	"log/slog"
	"net/http"
	"strings"
)

// Middleware rejects any request without a valid bearer token. The failure
// reason is logged but never sent to the client, and tokens are never logged.
func Middleware(v *Verifier, onReject func(w http.ResponseWriter)) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw, ok := bearerToken(r)
			if !ok {
				onReject(w)
				return
			}
			id, err := v.Verify(r.Context(), raw)
			if err != nil {
				slog.Info("token rejected", "reason", err.Error(), "path", r.URL.Path)
				onReject(w)
				return
			}
			next.ServeHTTP(w, r.WithContext(WithIdentity(r.Context(), id)))
		})
	}
}

func bearerToken(r *http.Request) (string, bool) {
	scheme, token, found := strings.Cut(strings.TrimSpace(r.Header.Get("Authorization")), " ")
	if !found || !strings.EqualFold(scheme, "Bearer") {
		return "", false
	}
	token = strings.TrimSpace(token)
	return token, token != ""
}
