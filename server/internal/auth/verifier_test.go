package auth

import (
	"context"
	"crypto/ecdsa"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestVerifyAcceptsValidES256Token(t *testing.T) {
	key := newECKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": key})
	v := newTestVerifier(srv.URL, "")

	id, err := v.Verify(context.Background(), signES256(t, "k1", key, baseClaims()))
	if err != nil {
		t.Fatalf("expected valid token, got %v", err)
	}
	if id.UserID != testUserID || id.Email != "user@example.com" || id.Role != "authenticated" {
		t.Fatalf("unexpected identity %+v", id)
	}
}

func TestVerifyRejectsInvalidTokens(t *testing.T) {
	key := newECKey(t)
	other := newECKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": key})
	v := newTestVerifier(srv.URL, "")

	with := func(mutate func(jwt.MapClaims)) string {
		c := baseClaims()
		mutate(c)
		return signES256(t, "k1", key, c)
	}
	hs256, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, baseClaims()).SignedString([]byte("secret"))
	none, _ := jwt.NewWithClaims(jwt.SigningMethodNone, baseClaims()).SignedString(jwt.UnsafeAllowNoneSignatureType)

	cases := map[string]string{
		"empty":             "",
		"garbage":           "not-a-jwt",
		"expired":           with(func(c jwt.MapClaims) { c["exp"] = time.Now().Add(-time.Hour).Unix() }),
		"missing exp":       with(func(c jwt.MapClaims) { delete(c, "exp") }),
		"wrong issuer":      with(func(c jwt.MapClaims) { c["iss"] = "https://evil.example/auth/v1" }),
		"wrong audience":    with(func(c jwt.MapClaims) { c["aud"] = "service" }),
		"missing subject":   with(func(c jwt.MapClaims) { delete(c, "sub") }),
		"non-uuid subject":  with(func(c jwt.MapClaims) { c["sub"] = "admin" }),
		"not yet valid":     with(func(c jwt.MapClaims) { c["nbf"] = time.Now().Add(time.Hour).Unix() }),
		"bad signature":     signES256(t, "k1", other, baseClaims()),
		"unknown kid":       signES256(t, "nope", key, baseClaims()),
		"missing kid":       signES256(t, "", key, baseClaims()),
		"alg none":          none,
		"hs256 not enabled": hs256,
	}
	for name, token := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := v.Verify(context.Background(), token)
			if !errors.Is(err, ErrInvalidToken) {
				t.Fatalf("expected ErrInvalidToken, got %v", err)
			}
		})
	}
}

func TestVerifyRejectsTamperedPayload(t *testing.T) {
	key := newECKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": key})
	v := newTestVerifier(srv.URL, "")

	good := signES256(t, "k1", key, baseClaims())
	evil := signES256(t, "k1", newECKey(t), func() jwt.MapClaims {
		c := baseClaims()
		c["sub"] = "11111111-1111-4111-8111-111111111111"
		return c
	}())
	// Splice the forged payload under the genuine signature.
	forged := splitJoin(evil, 1, good, 2)
	if _, err := v.Verify(context.Background(), forged); err == nil {
		t.Fatal("expected tampered token to be rejected")
	}
}

func TestVerifyAcceptsLegacyHS256OnlyWhenSecretConfigured(t *testing.T) {
	srv := newJWKSServer(t, nil)
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, baseClaims()).SignedString([]byte("legacy-secret"))
	if err != nil {
		t.Fatal(err)
	}

	if _, err := newTestVerifier(srv.URL, "legacy-secret").Verify(context.Background(), token); err != nil {
		t.Fatalf("expected HS256 token to verify: %v", err)
	}
	if _, err := newTestVerifier(srv.URL, "different-secret").Verify(context.Background(), token); err == nil {
		t.Fatal("expected wrong HS256 secret to be rejected")
	}
}

func TestVerifyPicksUpRotatedKeysWithRateLimitedRefetch(t *testing.T) {
	oldKey, newKey := newECKey(t), newECKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"old": oldKey})
	v := newTestVerifier(srv.URL, "")
	clock := time.Now()
	v.keys.now = func() time.Time { return clock }

	if _, err := v.Verify(context.Background(), signES256(t, "old", oldKey, baseClaims())); err != nil {
		t.Fatal(err)
	}
	srv.addKey("new", newKey)
	rotated := signES256(t, "new", newKey, baseClaims())

	if _, err := v.Verify(context.Background(), rotated); err == nil {
		t.Fatal("expected unknown kid to be rejected inside the refetch cooldown")
	}
	if got := srv.fetches(); got != 1 {
		t.Fatalf("expected a single JWKS fetch inside the cooldown, got %d", got)
	}

	clock = clock.Add(time.Minute)
	if _, err := v.Verify(context.Background(), rotated); err != nil {
		t.Fatalf("expected rotated key to verify after refetch: %v", err)
	}
	if _, err := v.Verify(context.Background(), signES256(t, "old", oldKey, baseClaims())); err != nil {
		t.Fatalf("expected old key to remain valid while published: %v", err)
	}
}

func TestVerifyKeepsServingCachedKeysWhenJWKSIsDown(t *testing.T) {
	key := newECKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": key})
	v := newTestVerifier(srv.URL, "")
	clock := time.Now()
	v.keys.now = func() time.Time { return clock }

	token := signES256(t, "k1", key, baseClaims())
	if _, err := v.Verify(context.Background(), token); err != nil {
		t.Fatal(err)
	}
	srv.Close()
	clock = clock.Add(time.Hour)

	if _, err := v.Verify(context.Background(), token); err != nil {
		t.Fatalf("expected cached key to keep working: %v", err)
	}
}
