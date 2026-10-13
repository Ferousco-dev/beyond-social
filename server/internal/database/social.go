package database

import (
	"context"
	"errors"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/social"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SocialStore implements social.Store.
type SocialStore struct {
	pool *pgxpool.Pool
}

func NewSocialStore(pool *pgxpool.Pool) *SocialStore { return &SocialStore{pool: pool} }

const socialColumns = `id::text, user_id::text, platform, account_id, account_name, access_ct, refresh_ct, expires_at, scopes, revoked_at, created_at`

func scanConnection(row pgx.Row) (social.Connection, error) {
	var c social.Connection
	var platform string
	err := row.Scan(&c.ID, &c.UserID, &platform, &c.AccountID, &c.AccountName, &c.AccessCT, &c.RefreshCT, &c.ExpiresAt, &c.Scopes, &c.RevokedAt, &c.CreatedAt)
	c.Platform = social.Platform(platform)
	if errors.Is(err, pgx.ErrNoRows) {
		return social.Connection{}, social.ErrNotConnected
	}
	return c, err
}

func (s *SocialStore) SaveState(ctx context.Context, stateHash []byte, userID string, p social.Platform, verifierCT []byte, expires time.Time) error {
	_, err := s.pool.Exec(ctx, `
		insert into public.social_oauth_states (state_hash, user_id, platform, verifier_ct, expires_at)
		values ($1, $2, $3, $4, $5)`, stateHash, userID, string(p), verifierCT, expires)
	return err
}

func (s *SocialStore) TakeState(ctx context.Context, stateHash []byte, now time.Time) (social.PendingSignIn, bool, error) {
	var p social.PendingSignIn
	var platform string
	err := s.pool.QueryRow(ctx, `
		delete from public.social_oauth_states where state_hash = $1 and expires_at > $2
		returning user_id::text, platform, verifier_ct`, stateHash, now).Scan(&p.UserID, &platform, &p.VerifierCT)
	if errors.Is(err, pgx.ErrNoRows) {
		return social.PendingSignIn{}, false, nil
	}
	p.Platform = social.Platform(platform)
	return p, err == nil, err
}

func (s *SocialStore) Upsert(ctx context.Context, c social.Connection) error {
	_, err := s.pool.Exec(ctx, `
		insert into public.social_connections (user_id, platform, account_id, account_name, access_ct, refresh_ct, expires_at, scopes)
		values ($1, $2, $3, $4, $5, $6, $7, $8)
		on conflict (user_id, platform) do update set
			account_id = excluded.account_id, account_name = excluded.account_name,
			access_ct = excluded.access_ct, refresh_ct = excluded.refresh_ct,
			expires_at = excluded.expires_at, scopes = excluded.scopes,
			revoked_at = null, updated_at = now()`,
		c.UserID, string(c.Platform), c.AccountID, c.AccountName, c.AccessCT, c.RefreshCT, c.ExpiresAt, c.Scopes)
	return err
}

func (s *SocialStore) List(ctx context.Context, userID string) ([]social.Connection, error) {
	rows, err := s.pool.Query(ctx, `select `+socialColumns+` from public.social_connections where user_id = $1 order by platform`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []social.Connection{}
	for rows.Next() {
		c, err := scanConnection(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *SocialStore) Get(ctx context.Context, userID string, p social.Platform) (social.Connection, error) {
	return scanConnection(s.pool.QueryRow(ctx, `select `+socialColumns+` from public.social_connections where user_id = $1 and platform = $2`, userID, string(p)))
}

func (s *SocialStore) UpdateTokens(ctx context.Context, id string, accessCT, refreshCT []byte, expiresAt *time.Time) error {
	_, err := s.pool.Exec(ctx, `
		update public.social_connections set access_ct = $2, refresh_ct = coalesce($3, refresh_ct), expires_at = $4, updated_at = now()
		where id = $1`, id, accessCT, refreshCT, expiresAt)
	return err
}

func (s *SocialStore) MarkRevoked(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `update public.social_connections set revoked_at = now(), updated_at = now() where id = $1 and revoked_at is null`, id)
	return err
}

func (s *SocialStore) Delete(ctx context.Context, userID string, p social.Platform) (social.Connection, error) {
	return scanConnection(s.pool.QueryRow(ctx, `delete from public.social_connections where user_id = $1 and platform = $2 returning `+socialColumns, userID, string(p)))
}

func (s *SocialStore) PurgeStates(ctx context.Context, now time.Time) error {
	_, err := s.pool.Exec(ctx, `delete from public.social_oauth_states where expires_at <= $1`, now)
	return err
}
