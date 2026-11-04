// Package social connects a user's accounts on YouTube, TikTok and Instagram
// and publishes finished videos to them. Sign-in is OAuth with a server-side
// state and PKCE; tokens are encrypted before they are stored.
package social

import (
	"context"
	"errors"
	"time"
)

type Platform string

const (
	YouTube   Platform = "youtube"
	TikTok    Platform = "tiktok"
	Instagram Platform = "instagram"
)

// Platforms lists what can be connected, in display order.
var Platforms = []Platform{YouTube, TikTok, Instagram}

func (p Platform) Valid() bool {
	for _, known := range Platforms {
		if p == known {
			return true
		}
	}
	return false
}

var (
	// ErrNotConfigured means the platform's app credentials have not been set up.
	ErrNotConfigured = errors.New("this platform is not set up yet")
	ErrBadState      = errors.New("the sign-in link is invalid or expired")
	ErrNotConnected  = errors.New("that account is not connected")
	// ErrReconnect means the platform no longer honours the saved sign-in.
	ErrReconnect = errors.New("the account needs to be connected again")
)

// Tokens are what a platform gives after sign-in.
type Tokens struct {
	Access    string
	Refresh   string
	ExpiresAt *time.Time
	Scopes    []string
}

// Account is who signed in, as the platform knows them.
type Account struct {
	ID   string
	Name string
}

// Credentials are an app's keys, read at the moment they are used so an admin
// can paste new ones without a restart.
type Credentials struct {
	ID     string
	Secret string
}

// Provider is one platform's sign-in and publishing.
type Provider interface {
	Platform() Platform
	Label() string
	AuthorizeURL(c Credentials, redirectURI, state, challenge string) string
	Exchange(ctx context.Context, c Credentials, redirectURI, code, verifier string) (Tokens, Account, error)
	Refresh(ctx context.Context, c Credentials, t Tokens) (Tokens, error)
	// Revoke asks the platform to forget the token. Best effort.
	Revoke(ctx context.Context, t Tokens) error
}

// Connection is a saved sign-in. Its tokens stay sealed until used.
type Connection struct {
	ID          string
	UserID      string
	Platform    Platform
	AccountID   string
	AccountName string
	AccessCT    []byte
	RefreshCT   []byte
	ExpiresAt   *time.Time
	Scopes      []string
	RevokedAt   *time.Time
	CreatedAt   time.Time
}

// PendingSignIn is a started OAuth flow waiting for the platform to come back.
type PendingSignIn struct {
	UserID     string
	Platform   Platform
	VerifierCT []byte
}

type Store interface {
	SaveState(ctx context.Context, stateHash []byte, userID string, p Platform, verifierCT []byte, expires time.Time) error
	// TakeState returns and deletes a state in one step, so it works once.
	TakeState(ctx context.Context, stateHash []byte, now time.Time) (PendingSignIn, bool, error)
	Upsert(ctx context.Context, c Connection) error
	List(ctx context.Context, userID string) ([]Connection, error)
	Get(ctx context.Context, userID string, p Platform) (Connection, error)
	UpdateTokens(ctx context.Context, id string, accessCT, refreshCT []byte, expiresAt *time.Time) error
	MarkRevoked(ctx context.Context, id string) error
	Delete(ctx context.Context, userID string, p Platform) (Connection, error)
	PurgeStates(ctx context.Context, now time.Time) error
}
