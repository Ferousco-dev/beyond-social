package auth

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	testIssuer = "https://project.supabase.co/auth/v1"
	testUserID = "6f1c5a0e-7a53-4d0e-9f56-0a3f6a1b2c3d"
)

type jwksServer struct {
	*httptest.Server
	mu    sync.Mutex
	keys  map[string]*ecdsa.PublicKey
	calls int
}

func newJWKSServer(t *testing.T, keys map[string]*ecdsa.PrivateKey) *jwksServer {
	t.Helper()
	s := &jwksServer{keys: map[string]*ecdsa.PublicKey{}}
	for kid, key := range keys {
		s.keys[kid] = &key.PublicKey
	}
	s.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		s.mu.Lock()
		defer s.mu.Unlock()
		s.calls++
		entries := []map[string]string{}
		for kid, pub := range s.keys {
			point, err := pub.Bytes() // 0x04, then X and Y at 32 bytes each
			if err != nil {
				panic(err)
			}
			entries = append(entries, map[string]string{
				"kty": "EC", "crv": "P-256", "kid": kid, "alg": "ES256",
				"x": base64.RawURLEncoding.EncodeToString(point[1:33]),
				"y": base64.RawURLEncoding.EncodeToString(point[33:]),
			})
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": entries})
	}))
	t.Cleanup(s.Close)
	return s
}

func (s *jwksServer) addKey(kid string, key *ecdsa.PrivateKey) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.keys[kid] = &key.PublicKey
}

func (s *jwksServer) fetches() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.calls
}

func newECKey(t *testing.T) *ecdsa.PrivateKey {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	return key
}

func baseClaims() jwt.MapClaims {
	return jwt.MapClaims{
		"iss":   testIssuer,
		"aud":   "authenticated",
		"sub":   testUserID,
		"email": "user@example.com",
		"role":  "authenticated",
		"iat":   time.Now().Add(-time.Minute).Unix(),
		"exp":   time.Now().Add(time.Hour).Unix(),
	}
}

func signES256(t *testing.T, kid string, key *ecdsa.PrivateKey, claims jwt.MapClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	if kid != "" {
		token.Header["kid"] = kid
	}
	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return signed
}

func newTestVerifier(jwksURL, secret string) *Verifier {
	return NewVerifier(Options{Issuer: testIssuer, JWKSURL: jwksURL, HS256Secret: secret})
}

// splitJoin builds header.payload.signature from the named parts of two tokens.
func splitJoin(payloadFrom string, payloadIdx int, sigFrom string, sigIdx int) string {
	p := strings.Split(payloadFrom, ".")
	s := strings.Split(sigFrom, ".")
	return p[0] + "." + p[payloadIdx] + "." + s[sigIdx]
}
