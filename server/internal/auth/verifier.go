// Package auth verifies Supabase access tokens. A token is trusted only after
// its signature, issuer, audience and expiry have all been checked; the user
// ID is taken from the verified `sub` claim and nowhere else.
package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const audience = "authenticated"

var ErrInvalidToken = errors.New("invalid token")

type Options struct {
	Issuer  string
	JWKSURL string
	// HS256Secret is optional and only for projects on the legacy shared secret.
	HS256Secret string
	HTTPClient  *http.Client
}

type Verifier struct {
	issuer string
	secret []byte
	keys   *keySet
	parser *jwt.Parser
}

type claims struct {
	jwt.RegisteredClaims
	Email string `json:"email"`
	Role  string `json:"role"`
}

func NewVerifier(opts Options) *Verifier {
	client := opts.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second}
	}
	return &Verifier{
		issuer: opts.Issuer,
		secret: []byte(opts.HS256Secret),
		keys:   newKeySet(opts.JWKSURL, client),
		parser: jwt.NewParser(
			jwt.WithValidMethods([]string{"ES256", "RS256", "HS256"}),
			jwt.WithIssuer(opts.Issuer),
			jwt.WithAudience(audience),
			jwt.WithExpirationRequired(),
			jwt.WithLeeway(5*time.Second),
		),
	}
}

// Verify returns the identity inside a valid token. Every failure wraps
// ErrInvalidToken; the detail is for logs and must not reach clients.
func (v *Verifier) Verify(ctx context.Context, raw string) (Identity, error) {
	if strings.TrimSpace(raw) == "" {
		return Identity{}, fmt.Errorf("%w: empty", ErrInvalidToken)
	}

	var c claims
	if _, err := v.parser.ParseWithClaims(raw, &c, func(t *jwt.Token) (any, error) {
		return v.keyFor(ctx, t)
	}); err != nil {
		return Identity{}, fmt.Errorf("%w: %w", ErrInvalidToken, err)
	}

	if _, err := uuid.Parse(c.Subject); err != nil {
		return Identity{}, fmt.Errorf("%w: subject is not a user id", ErrInvalidToken)
	}
	return Identity{UserID: c.Subject, Email: c.Email, Role: c.Role}, nil
}

func (v *Verifier) keyFor(ctx context.Context, t *jwt.Token) (any, error) {
	if t.Method.Alg() == "HS256" {
		if len(v.secret) == 0 {
			return nil, errors.New("HS256 tokens are not accepted")
		}
		return v.secret, nil
	}
	kid, _ := t.Header["kid"].(string)
	if kid == "" {
		return nil, errors.New("token has no key id")
	}
	return v.keys.key(ctx, kid)
}
