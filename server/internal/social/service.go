package social

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

const (
	stateTTL = 10 * time.Minute
	// refreshMargin renews a token slightly before it expires, so a publish never
	// starts with one that dies mid-upload.
	refreshMargin = 2 * time.Minute
)

// Sealer encrypts what is stored. name binds a value to its place.
type Sealer interface {
	Seal(name, plaintext string) ([]byte, error)
	Open(name string, sealed []byte) (string, error)
}

// Keys reads an app credential, or fails with provider.ErrNotConfigured.
type Keys func(ctx context.Context, name string) (string, error)

type Service struct {
	store     Store
	sealer    Sealer
	keys      Keys
	redirect  func(Platform) string
	providers map[Platform]Provider
	now       func() time.Time
}

// credentialNames says which stored keys each platform signs in with.
var credentialNames = map[Platform][2]string{
	YouTube:   {"youtube_client_id", "youtube_client_secret"},
	TikTok:    {"tiktok_client_key", "tiktok_client_secret"},
	Instagram: {"meta_app_id", "meta_app_secret"},
}

// NewService wires sign-in. redirect gives the address a platform sends the
// browser back to; it must match what is registered in the platform's console.
func NewService(store Store, sealer Sealer, keys Keys, redirect func(Platform) string, providers ...Provider) *Service {
	byPlatform := make(map[Platform]Provider, len(providers))
	for _, p := range providers {
		byPlatform[p.Platform()] = p
	}
	return &Service{store: store, sealer: sealer, keys: keys, redirect: redirect, providers: byPlatform, now: time.Now}
}

func (s *Service) provider(p Platform) (Provider, error) {
	prov, ok := s.providers[p]
	if !ok {
		return nil, ErrNotConfigured
	}
	return prov, nil
}

func (s *Service) credentials(ctx context.Context, p Platform) (Credentials, error) {
	names := credentialNames[p]
	id, err := s.keys(ctx, names[0])
	if err != nil {
		return Credentials{}, ErrNotConfigured
	}
	secret, err := s.keys(ctx, names[1])
	if err != nil {
		return Credentials{}, ErrNotConfigured
	}
	return Credentials{ID: id, Secret: secret}, nil
}

// Status is one platform as the user sees it.
type Status struct {
	Platform    Platform   `json:"platform"`
	Label       string     `json:"label"`
	Available   bool       `json:"available"`
	Connected   bool       `json:"connected"`
	NeedsSignIn bool       `json:"needs_reconnect"`
	AccountName string     `json:"account_name,omitempty"`
	ConnectedAt *time.Time `json:"connected_at,omitempty"`
}

// List shows every platform, whether it can be connected here, and whether this
// user has.
func (s *Service) List(ctx context.Context, userID string) ([]Status, error) {
	conns, err := s.store.List(ctx, userID)
	if err != nil {
		return nil, err
	}
	byPlatform := map[Platform]Connection{}
	for _, c := range conns {
		byPlatform[c.Platform] = c
	}
	out := make([]Status, 0, len(Platforms))
	for _, p := range Platforms {
		prov, known := s.providers[p]
		st := Status{Platform: p, Label: string(p)}
		if known {
			st.Label = prov.Label()
			_, err := s.credentials(ctx, p)
			st.Available = err == nil
		}
		if c, ok := byPlatform[p]; ok {
			created := c.CreatedAt
			st.Connected, st.AccountName, st.ConnectedAt = true, c.AccountName, &created
			st.NeedsSignIn = c.RevokedAt != nil
		}
		out = append(out, st)
	}
	return out, nil
}

// Begin starts a sign-in and returns where to send the browser.
func (s *Service) Begin(ctx context.Context, userID string, p Platform) (string, error) {
	if s.sealer == nil {
		return "", ErrNotConfigured // tokens cannot be stored without an encryption key
	}
	prov, err := s.provider(p)
	if err != nil {
		return "", err
	}
	creds, err := s.credentials(ctx, p)
	if err != nil {
		return "", err
	}
	state, err := randomToken()
	if err != nil {
		return "", err
	}
	verifier, err := randomToken()
	if err != nil {
		return "", err
	}
	sealed, err := s.sealer.Seal(verifierName(p), verifier)
	if err != nil {
		return "", err
	}
	if err := s.store.SaveState(ctx, hash(state), userID, p, sealed, s.now().Add(stateTTL)); err != nil {
		return "", err
	}
	_ = s.store.PurgeStates(ctx, s.now()) // housekeeping: never fail a sign-in over it
	return prov.AuthorizeURL(creds, s.redirect(p), state, challenge(verifier)), nil
}

// Complete finishes a sign-in when the platform sends the browser back. The
// state proves which user started it; it works once and expires.
func (s *Service) Complete(ctx context.Context, p Platform, code, state string) (string, error) {
	if s.sealer == nil {
		return "", ErrNotConfigured
	}
	pending, ok, err := s.store.TakeState(ctx, hash(state), s.now())
	if err != nil {
		return "", err
	}
	if !ok || pending.Platform != p {
		return "", ErrBadState
	}
	prov, err := s.provider(p)
	if err != nil {
		return "", err
	}
	creds, err := s.credentials(ctx, p)
	if err != nil {
		return "", err
	}
	verifier, err := s.sealer.Open(verifierName(p), pending.VerifierCT)
	if err != nil {
		return "", ErrBadState
	}
	tokens, account, err := prov.Exchange(ctx, creds, s.redirect(p), code, verifier)
	if err != nil {
		return "", err
	}
	conn, err := s.seal(pending.UserID, p, account, tokens)
	if err != nil {
		return "", err
	}
	if err := s.store.Upsert(ctx, conn); err != nil {
		return "", err
	}
	return pending.UserID, nil
}

func (s *Service) seal(userID string, p Platform, a Account, t Tokens) (Connection, error) {
	access, err := s.sealer.Seal(tokenName(userID, p, "access"), t.Access)
	if err != nil {
		return Connection{}, err
	}
	var refresh []byte
	if t.Refresh != "" {
		if refresh, err = s.sealer.Seal(tokenName(userID, p, "refresh"), t.Refresh); err != nil {
			return Connection{}, err
		}
	}
	return Connection{UserID: userID, Platform: p, AccountID: a.ID, AccountName: a.Name,
		AccessCT: access, RefreshCT: refresh, ExpiresAt: t.ExpiresAt, Scopes: t.Scopes}, nil
}

// Disconnect forgets an account and asks the platform to revoke the token.
func (s *Service) Disconnect(ctx context.Context, userID string, p Platform) error {
	conn, err := s.store.Delete(ctx, userID, p)
	if err != nil {
		return err
	}
	prov, err := s.provider(p)
	if err != nil {
		return nil
	}
	if tokens, err := s.open(conn); err == nil {
		if err := prov.Revoke(ctx, tokens); err != nil {
			slog.Warn("revoke social token", "platform", p, "error", err)
		}
	}
	return nil
}

func (s *Service) open(c Connection) (Tokens, error) {
	access, err := s.sealer.Open(tokenName(c.UserID, c.Platform, "access"), c.AccessCT)
	if err != nil {
		return Tokens{}, err
	}
	t := Tokens{Access: access, ExpiresAt: c.ExpiresAt, Scopes: c.Scopes}
	if len(c.RefreshCT) > 0 {
		if t.Refresh, err = s.sealer.Open(tokenName(c.UserID, c.Platform, "refresh"), c.RefreshCT); err != nil {
			return Tokens{}, err
		}
	}
	return t, nil
}

// Usable says whether posts can go to this account: it is connected and its
// sign-in has not been revoked.
func (s *Service) Usable(ctx context.Context, userID string, p Platform) error {
	conn, err := s.store.Get(ctx, userID, p)
	if err != nil {
		return err
	}
	if conn.RevokedAt != nil {
		return ErrReconnect
	}
	return nil
}

// Token returns a usable access token for publishing, renewing it first when it
// is about to expire. A platform that refuses the renewal marks the connection
// as needing sign-in again.
func (s *Service) Token(ctx context.Context, userID string, p Platform) (Tokens, Connection, error) {
	conn, err := s.store.Get(ctx, userID, p)
	if err != nil {
		return Tokens{}, Connection{}, err
	}
	if conn.RevokedAt != nil {
		return Tokens{}, conn, ErrReconnect
	}
	tokens, err := s.open(conn)
	if err != nil {
		return Tokens{}, conn, err
	}
	if tokens.ExpiresAt == nil || s.now().Add(refreshMargin).Before(*tokens.ExpiresAt) {
		return tokens, conn, nil
	}
	if tokens.Refresh == "" {
		_ = s.store.MarkRevoked(ctx, conn.ID)
		return Tokens{}, conn, ErrReconnect
	}
	prov, err := s.provider(p)
	if err != nil {
		return Tokens{}, conn, err
	}
	creds, err := s.credentials(ctx, p)
	if err != nil {
		return Tokens{}, conn, err
	}
	renewed, err := prov.Refresh(ctx, creds, tokens)
	if err != nil {
		var pe *provider.Error
		if errors.As(err, &pe) && !pe.Transient {
			_ = s.store.MarkRevoked(ctx, conn.ID)
			return Tokens{}, conn, ErrReconnect
		}
		return Tokens{}, conn, err
	}
	if renewed.Refresh == "" {
		renewed.Refresh = tokens.Refresh // some platforms only issue it once
	}
	sealed, err := s.seal(userID, p, Account{ID: conn.AccountID, Name: conn.AccountName}, renewed)
	if err != nil {
		return Tokens{}, conn, err
	}
	if err := s.store.UpdateTokens(ctx, conn.ID, sealed.AccessCT, sealed.RefreshCT, renewed.ExpiresAt); err != nil {
		return Tokens{}, conn, err
	}
	return renewed, conn, nil
}

func verifierName(p Platform) string { return "social-verifier:" + string(p) }

func tokenName(userID string, p Platform, kind string) string {
	return fmt.Sprintf("social:%s:%s:%s", userID, p, kind)
}

func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func hash(state string) []byte {
	sum := sha256.Sum256([]byte(state))
	return sum[:]
}

// challenge is the S256 PKCE challenge for a verifier.
func challenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}
