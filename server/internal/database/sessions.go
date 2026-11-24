package database

import (
	"context"
	"errors"
	"log/slog"
	"sync"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SessionStore reads Supabase's own sign-in sessions, which Supabase deletes
// when someone signs out.
type SessionStore struct {
	pool *pgxpool.Pool
	warn sync.Once
}

func NewSessionStore(pool *pgxpool.Pool) *SessionStore { return &SessionStore{pool: pool} }

// Alive says whether the session still exists and has not passed its end.
// A database without Supabase's auth schema, or a role that may not read it,
// cannot check sessions at all; then every session counts as alive and the
// problem is logged once, so a setup slip never locks everyone out.
func (s *SessionStore) Alive(ctx context.Context, sessionID string) (bool, error) {
	var alive bool
	err := s.pool.QueryRow(ctx, `
		select exists (
			select 1 from auth.sessions
			where id = $1::uuid and (not_after is null or not_after > now()))`, sessionID).Scan(&alive)
	if err == nil {
		return alive, nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "42P01", "3F000", "42501": // no such table, no such schema, permission denied
			s.warn.Do(func() {
				slog.Error("sign-in sessions cannot be read, so signed-out tokens stay valid until they expire", "code", pgErr.Code, "error", pgErr.Message)
			})
			return true, nil
		case pgInvalidTextRepresentation:
			return false, nil // not a session id at all
		}
	}
	return false, err
}
