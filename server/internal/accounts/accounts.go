// Package accounts keeps one profile row per Supabase Auth user. Supabase owns
// sign-up, passwords and sessions; the profile is ours and holds what the
// product needs to know about the person (role, suspension, deletion).
package accounts

import (
	"context"
	"errors"
	"time"
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
}

// Store creates the profile on first sight, so no database trigger on the auth
// schema is needed and a freshly reset database needs no backfill.
type Store interface {
	// Ensure returns the user's profile, creating it if it does not exist.
	Ensure(ctx context.Context, id, email, displayName string) (Profile, error)
}

type Service struct{ store Store }

func NewService(s Store) *Service { return &Service{store: s} }

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
	return p, nil
}
