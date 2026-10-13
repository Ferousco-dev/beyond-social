package database

import (
	"context"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ProfileStore implements accounts.Store.
type ProfileStore struct {
	pool        *pgxpool.Pool
	adminEmails map[string]bool
}

func NewProfileStore(pool *pgxpool.Pool) *ProfileStore { return &ProfileStore{pool: pool} }

// WithAdminEmails makes these addresses admins on their next sign-in.
func (s *ProfileStore) WithAdminEmails(emails []string) *ProfileStore {
	s.adminEmails = make(map[string]bool, len(emails))
	for _, e := range emails {
		s.adminEmails[strings.ToLower(strings.TrimSpace(e))] = true
	}
	return s
}

func (s *ProfileStore) Ensure(ctx context.Context, id, email, displayName string) (accounts.Profile, error) {
	var p accounts.Profile
	var role string
	// The no-op update makes RETURNING work on conflict without changing anything.
	err := s.pool.QueryRow(ctx, `
		insert into public.profiles (id, email, display_name)
		values ($1, $2, $3)
		on conflict (id) do update set id = excluded.id
		returning id::text, email, display_name, role, created_at, suspended_at, deleted_at, signup_granted_at`,
		id, email, displayName).Scan(&p.ID, &p.Email, &p.DisplayName, &role, &p.CreatedAt, &p.SuspendedAt, &p.DeletedAt, &p.GrantedAt)
	if err != nil {
		return p, err
	}
	p.Role = accounts.Role(role)
	if p.Role != accounts.RoleAdmin && s.adminEmails[strings.ToLower(p.Email)] {
		if _, err := s.pool.Exec(ctx, `update public.profiles set role = 'admin' where id = $1`, id); err != nil {
			return p, err
		}
		p.Role = accounts.RoleAdmin
	}
	return p, nil
}

func (s *ProfileStore) MarkGranted(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `update public.profiles set signup_granted_at = now() where id = $1 and signup_granted_at is null`, id)
	return err
}
