package database

import (
	"context"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ProfileStore implements accounts.Store.
type ProfileStore struct {
	pool *pgxpool.Pool
}

func NewProfileStore(pool *pgxpool.Pool) *ProfileStore { return &ProfileStore{pool: pool} }

func (s *ProfileStore) Ensure(ctx context.Context, id, email, displayName string) (accounts.Profile, error) {
	var p accounts.Profile
	var role string
	// The no-op update makes RETURNING work on conflict without changing anything.
	err := s.pool.QueryRow(ctx, `
		insert into public.profiles (id, email, display_name)
		values ($1, $2, $3)
		on conflict (id) do update set id = excluded.id
		returning id::text, email, display_name, role, created_at, suspended_at, deleted_at`,
		id, email, displayName).Scan(&p.ID, &p.Email, &p.DisplayName, &role, &p.CreatedAt, &p.SuspendedAt, &p.DeletedAt)
	p.Role = accounts.Role(role)
	return p, err
}
