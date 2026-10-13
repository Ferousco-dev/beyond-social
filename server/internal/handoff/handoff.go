// Package handoff lets a signed-in user record their avatar footage on a phone
// by scanning a QR code. The phone has no session: it holds a short-lived,
// single-use token, and everything it may do is decided here from that token.
package handoff

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"regexp"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
)

const Lifetime = 20 * time.Minute

// ErrInvalidLink is the one answer for expired, used, malformed and unknown
// tokens, so an unauthenticated caller cannot learn which tokens exist.
var ErrInvalidLink = errors.New("this link is no longer valid")

var tokenShape = regexp.MustCompile(`^[A-Za-z0-9_-]{43}$`)

// Store keeps only the SHA-256 of each token, the way an API key is kept, so a
// leaked backup contains nothing that can be scanned.
type Store interface {
	// Mint records a new handoff for the user, expiring any unclaimed earlier one.
	Mint(ctx context.Context, userID, tokenHash string, expires time.Time) error
	// Resolve returns the owner of a live (unexpired, unclaimed) token.
	Resolve(ctx context.Context, tokenHash string) (userID string, ok bool, err error)
	// Claim atomically marks a live token used, so two phones cannot both win.
	Claim(ctx context.Context, tokenHash, path string) (userID string, ok bool, err error)
}

// Avatars is the part of the avatar service a handoff uses.
type Avatars interface {
	NewUploadTicket(ctx context.Context, userID, contentType string) (avatars.UploadTicket, error)
	Register(ctx context.Context, userID string, in avatars.RegisterInput) (avatars.Avatar, bool, error)
}

type Service struct {
	store   Store
	avatars Avatars
	now     func() time.Time
}

func NewService(store Store, a Avatars) *Service {
	return &Service{store: store, avatars: a, now: time.Now}
}

type Minted struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

// Mint issues a fresh token for the signed-in user. The token itself leaves
// this service only in the response.
func (s *Service) Mint(ctx context.Context, userID string) (Minted, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return Minted{}, err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	expires := s.now().Add(Lifetime)
	if err := s.store.Mint(ctx, userID, hashToken(token), expires); err != nil {
		return Minted{}, err
	}
	return Minted{Token: token, ExpiresAt: expires}, nil
}

// Valid reports whether the token is live, for the page the phone lands on.
func (s *Service) Valid(ctx context.Context, token string) (bool, error) {
	if !tokenShape.MatchString(token) {
		return false, nil
	}
	_, ok, err := s.store.Resolve(ctx, hashToken(token))
	return ok, err
}

// Ticket issues an upload slot inside the token owner's folder.
func (s *Service) Ticket(ctx context.Context, token, contentType string) (avatars.UploadTicket, error) {
	owner, err := s.owner(ctx, token)
	if err != nil {
		return avatars.UploadTicket{}, err
	}
	return s.avatars.NewUploadTicket(ctx, owner, contentType)
}

// Claim spends the token against the uploaded recording and registers the
// avatar for the token's owner. The phone recorder shows the same consent
// statement as the desktop one, and HeyGen's hosted consent step still verifies
// the person on camera before the avatar can be used.
func (s *Service) Claim(ctx context.Context, token, path string) (avatars.Avatar, error) {
	if !tokenShape.MatchString(token) {
		return avatars.Avatar{}, ErrInvalidLink
	}
	hash := hashToken(token)
	owner, ok, err := s.store.Resolve(ctx, hash)
	if err != nil {
		return avatars.Avatar{}, err
	}
	if !ok {
		return avatars.Avatar{}, ErrInvalidLink
	}
	// Validate the recording before the single-use token is spent.
	avatar, _, err := s.avatars.Register(ctx, owner, avatars.RegisterInput{
		StoragePath: path, ConsentVersion: avatars.ConsentVersion, ConsentConfirmed: true, IdempotencyKey: "handoff:" + hash[:32],
	})
	if err != nil {
		return avatars.Avatar{}, err
	}
	if _, ok, err := s.store.Claim(ctx, hash, path); err != nil || !ok {
		if err != nil {
			return avatars.Avatar{}, err
		}
		return avatars.Avatar{}, ErrInvalidLink
	}
	return avatar, nil
}

func (s *Service) owner(ctx context.Context, token string) (string, error) {
	if !tokenShape.MatchString(token) {
		return "", ErrInvalidLink
	}
	owner, ok, err := s.store.Resolve(ctx, hashToken(token))
	if err != nil {
		return "", err
	}
	if !ok {
		return "", ErrInvalidLink
	}
	return owner, nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
