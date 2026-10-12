package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"sync"
	"time"
)

const (
	jwksTTL         = 10 * time.Minute
	jwksMinRefetch  = 30 * time.Second
	jwksMaxBodySize = 1 << 20
)

var errUnknownKey = errors.New("signing key not found")

// keySet caches the project's public signing keys. Keys are refetched when
// they age out or when a token names an unknown `kid`, which is how a key
// rotation reaches us. Unknown-kid refetches are rate limited so a stream of
// forged tokens cannot turn this service into a request amplifier.
type keySet struct {
	url    string
	client *http.Client
	now    func() time.Time

	mu        sync.Mutex
	keys      map[string]any
	fetchedAt time.Time
}

func newKeySet(url string, client *http.Client) *keySet {
	return &keySet{url: url, client: client, now: time.Now}
}

func (k *keySet) key(ctx context.Context, kid string) (any, error) {
	k.mu.Lock()
	defer k.mu.Unlock()

	age := k.now().Sub(k.fetchedAt)
	stale := k.keys == nil || age > jwksTTL
	if key, ok := k.keys[kid]; ok && !stale {
		return key, nil
	}
	if k.keys == nil || age > jwksMinRefetch {
		if err := k.refresh(ctx); err != nil {
			// A failed refresh must not take down verification of keys we
			// already trust, so fall back to the cached copy.
			if key, ok := k.keys[kid]; ok {
				return key, nil
			}
			return nil, err
		}
	}
	if key, ok := k.keys[kid]; ok {
		return key, nil
	}
	return nil, errUnknownKey
}

func (k *keySet) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, k.url, nil)
	if err != nil {
		return err
	}
	resp, err := k.client.Do(req)
	if err != nil {
		return fmt.Errorf("fetch jwks: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("fetch jwks: unexpected status %d", resp.StatusCode)
	}

	var doc struct {
		Keys []jwk `json:"keys"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, jwksMaxBodySize)).Decode(&doc); err != nil {
		return fmt.Errorf("decode jwks: %w", err)
	}

	keys := make(map[string]any, len(doc.Keys))
	for _, entry := range doc.Keys {
		if entry.Kid == "" {
			continue
		}
		if key, err := entry.publicKey(); err == nil {
			keys[entry.Kid] = key
		}
	}
	k.keys = keys
	k.fetchedAt = k.now()
	return nil
}

type jwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func (j jwk) publicKey() (any, error) {
	switch j.Kty {
	case "EC":
		if j.Crv != "P-256" {
			return nil, fmt.Errorf("unsupported curve %q", j.Crv)
		}
		x, y, err := decodeInts(j.X, j.Y)
		if err != nil {
			return nil, err
		}
		key := &ecdsa.PublicKey{Curve: elliptic.P256(), X: x, Y: y}
		if !key.Curve.IsOnCurve(x, y) {
			return nil, errors.New("point is not on curve")
		}
		return key, nil
	case "RSA":
		n, e, err := decodeInts(j.N, j.E)
		if err != nil {
			return nil, err
		}
		if !e.IsInt64() || e.Int64() < 3 || e.Int64() > 1<<31-1 {
			return nil, errors.New("invalid RSA exponent")
		}
		return &rsa.PublicKey{N: n, E: int(e.Int64())}, nil
	default:
		return nil, fmt.Errorf("unsupported key type %q", j.Kty)
	}
}

func decodeInts(a, b string) (*big.Int, *big.Int, error) {
	first, err := base64.RawURLEncoding.DecodeString(a)
	if err != nil {
		return nil, nil, err
	}
	second, err := base64.RawURLEncoding.DecodeString(b)
	if err != nil {
		return nil, nil, err
	}
	return new(big.Int).SetBytes(first), new(big.Int).SetBytes(second), nil
}
