package database

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// HandoffStore implements handoff.Store.
type HandoffStore struct {
	pool *pgxpool.Pool
}

func NewHandoffStore(pool *pgxpool.Pool) *HandoffStore { return &HandoffStore{pool: pool} }

func (s *HandoffStore) Mint(ctx context.Context, userID, tokenHash string, expires time.Time) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	// Refreshing the code must kill the one still on screen, or expiry means nothing.
	if _, err := tx.Exec(ctx, `
		update public.avatar_handoffs set expires_at = now()
		where user_id = $1 and claimed_at is null and expires_at > now()`, userID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		insert into public.avatar_handoffs (user_id, token_hash, expires_at) values ($1, $2, $3)`, userID, tokenHash, expires); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *HandoffStore) Resolve(ctx context.Context, tokenHash string) (string, bool, error) {
	var userID string
	err := s.pool.QueryRow(ctx, `
		select user_id::text from public.avatar_handoffs
		where token_hash = $1 and claimed_at is null and expires_at > now()`, tokenHash).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, nil
	}
	return userID, err == nil, err
}

// Claim is the same predicate as Resolve in an UPDATE, so two phones racing one
// QR cannot both succeed: the second matches no row.
func (s *HandoffStore) Claim(ctx context.Context, tokenHash, path string) (string, bool, error) {
	var userID string
	err := s.pool.QueryRow(ctx, `
		update public.avatar_handoffs set claimed_at = now(), storage_path = $2
		where token_hash = $1 and claimed_at is null and expires_at > now()
		returning user_id::text`, tokenHash, path).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, nil
	}
	return userID, err == nil, err
}
