// Package accounts keeps one profile row per Supabase Auth user. Supabase owns
// sign-up, passwords and sessions; the profile is ours and holds what the
// product needs to know about the person (role, suspension, deletion).
package accounts

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

var (
	ErrSuspended = errors.New("account is suspended")
	ErrDeleted   = errors.New("account is deleted")
)

type Role string

const (
	RoleUser  Role = "user"
	RoleAdmin Role = "admin"
)

type Profile struct {
	ID          string     `json:"id"`
	Email       string     `json:"email"`
	DisplayName string     `json:"display_name"`
	Role        Role       `json:"role"`
	CreatedAt   time.Time  `json:"created_at"`
	SuspendedAt *time.Time `json:"-"`
	DeletedAt   *time.Time `json:"-"`
	// GrantedAt is when the sign-up credits were applied.
	GrantedAt *time.Time `json:"-"`
}

// Store creates the profile on first sight, so no database trigger on the auth
// schema is needed and a freshly reset database needs no backfill.
type Store interface {
	// Ensure returns the user's profile, creating it if it does not exist.
	Ensure(ctx context.Context, id, email, displayName string) (Profile, error)
	MarkGranted(ctx context.Context, id string) error
	SetDisplayName(ctx context.Context, id, name string) (Profile, error)
	MarkDeleted(ctx context.Context, id string) error
}

// Granter gives a new account its starting credits. It must be idempotent.
type Granter interface {
	SignupGrant(ctx context.Context, userID string) error
}

type Service struct {
	store   Store
	granter Granter
}

func NewService(s Store) *Service { return &Service{store: s} }

// WithGranter turns on sign-up credits.
func (s *Service) WithGranter(g Granter) *Service {
	s.granter = g
	return s
}

// Active returns the profile of a user allowed to use the product, creating it
// on first use. Suspended and deleted accounts are refused.
func (s *Service) Active(ctx context.Context, id, email, displayName string) (Profile, error) {
	p, err := s.store.Ensure(ctx, id, email, displayName)
	if err != nil {
		return Profile{}, err
	}
	switch {
	case p.DeletedAt != nil:
		return Profile{}, ErrDeleted
	case p.SuspendedAt != nil:
		return Profile{}, ErrSuspended
	}
	if s.granter != nil && p.GrantedAt == nil {
		// Idempotent, so a failure here is retried by the next request.
		if err := s.granter.SignupGrant(ctx, p.ID); err != nil {
			return Profile{}, err
		}
		if err := s.store.MarkGranted(ctx, p.ID); err != nil {
			return Profile{}, err
		}
	}
	return p, nil
}

var (
	ErrInvalidName     = errors.New("accounts: the name must be 1 to 80 characters")
	ErrConfirmMismatch = errors.New("accounts: the email does not match")
)

const maxNameRunes = 80

// Rename changes what the person is called in the product.
func (s *Service) Rename(ctx context.Context, id, name string) (Profile, error) {
	name = strings.TrimSpace(name)
	if name == "" || utf8.RuneCountInString(name) > maxNameRunes || strings.ContainsFunc(name, unicode.IsControl) {
		return Profile{}, ErrInvalidName
	}
	return s.store.SetDisplayName(ctx, id, name)
}

// SignInRemover deletes a person's sign-in.
type SignInRemover interface {
	RemoveUser(ctx context.Context, id string) error
}

// Delete closes an account. The person must type their own email, as a check
// that they meant it. The sign-in is removed first, so if that fails nothing has
// changed and they can try again; the profile is then marked deleted, which
// stops the API at once. Records that other tables hold, such as the credit
// ledger, are kept.
func (s *Service) Delete(ctx context.Context, id, email, confirm string, remover SignInRemover) error {
	if !strings.EqualFold(strings.TrimSpace(confirm), strings.TrimSpace(email)) || email == "" {
		return ErrConfirmMismatch
	}
	if err := remover.RemoveUser(ctx, id); err != nil {
		return err
	}
	return s.store.MarkDeleted(ctx, id)
}
