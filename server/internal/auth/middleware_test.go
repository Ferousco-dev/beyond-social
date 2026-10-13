package auth

import (
	"crypto/ecdsa"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMiddlewareAuthenticatesAndExposesIdentity(t *testing.T) {
	key := newECKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": key})
	token := signES256(t, "k1", key, baseClaims())

	var got Identity
	handler := Middleware(newTestVerifier(srv.URL, ""), func(w http.ResponseWriter) {
		w.WriteHeader(http.StatusUnauthorized)
	})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got, _ = IdentityFromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
	req.Header.Set("Authorization", "bearer "+token)
	// A client-supplied identity header must never influence the result.
	req.Header.Set("X-User-Id", "11111111-1111-4111-8111-111111111111")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if got.UserID != testUserID {
		t.Fatalf("expected identity from token, got %+v", got)
	}
}

func TestMiddlewareRejectsBadAuthorization(t *testing.T) {
	key := newECKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": key})
	handler := Middleware(newTestVerifier(srv.URL, ""), func(w http.ResponseWriter) {
		w.WriteHeader(http.StatusUnauthorized)
	})(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Fatal("handler must not run for unauthenticated requests")
	}))

	for name, header := range map[string]string{
		"missing":      "",
		"wrong scheme": "Basic abc",
		"no token":     "Bearer ",
		"garbage":      "Bearer nope",
	} {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if header != "" {
				req.Header.Set("Authorization", header)
			}
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401, got %d", res.Code)
			}
		})
	}
}

func TestIdentityFromContextFalseWhenUnset(t *testing.T) {
	if _, ok := IdentityFromContext(httptest.NewRequest(http.MethodGet, "/", nil).Context()); ok {
		t.Fatal("expected no identity")
	}
}
