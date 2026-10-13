package database

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const avatarColumns = `id::text, user_id::text, coalesce(name, ''), is_default, training_status,
	coalesce(storage_path, ''), coalesce(provider_avatar_id, ''), coalesce(provider_look_id, ''),
	coalesce(provider_voice_id, ''), coalesce(selected_voice_id, ''), coalesce(provider_consent_status, ''),
	coalesce(provider_consent_url, ''), provider_consent_url_expires_at, coalesce(provider_preview_image_url, ''),
	coalesce(provider_preview_video_url, ''), coalesce(provider_error, ''), coalesce(consent_reroute_url, ''),
	poll_count, submit_started_at, footage_deleted_at is not null or storage_path is null, created_at, updated_at, trained_at`

const pgCheckViolation = "23514"

// AvatarStore implements avatars.Repository over the avatars table.
type AvatarStore struct {
	pool *pgxpool.Pool
}

func NewAvatarStore(pool *pgxpool.Pool) *AvatarStore { return &AvatarStore{pool: pool} }

func (s *AvatarStore) Create(ctx context.Context, n avatars.NewAvatar) (avatars.Avatar, bool, error) {
	created, err := scanAvatar(s.pool.QueryRow(ctx, `
		insert into public.avatars (user_id, name, storage_path, consent_version, consent_at, training_status,
			consent_reroute_url, idempotency_key, is_default, next_run_at)
		values ($1, $2, $3, $4, now(), 'pending', nullif($5, ''), nullif($6, ''),
			not exists (select 1 from public.avatars where user_id = $1 and is_default), now())
		on conflict (user_id, idempotency_key) where idempotency_key is not null do nothing
		returning `+avatarColumns, n.UserID, n.Name, n.StoragePath, n.ConsentVersion, n.RerouteURL, n.IdempotencyKey))
	if err == nil {
		return created, true, nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == pgCheckViolation && pgErr.Message == "avatar_limit_reached" {
		return avatars.Avatar{}, false, avatars.ErrLimitReached
	}
	if !errors.Is(err, avatars.ErrNotFound) || n.IdempotencyKey == "" {
		return avatars.Avatar{}, false, err
	}
	existing, err := scanAvatar(s.pool.QueryRow(ctx, `
		select `+avatarColumns+` from public.avatars where user_id = $1 and idempotency_key = $2`, n.UserID, n.IdempotencyKey))
	return existing, false, err
}

func (s *AvatarStore) Get(ctx context.Context, userID, id string) (avatars.Avatar, error) {
	return scanAvatar(s.pool.QueryRow(ctx, `
		select `+avatarColumns+` from public.avatars where id = $1 and user_id = $2`, id, userID))
}

func (s *AvatarStore) List(ctx context.Context, userID string, limit, offset int) ([]avatars.Avatar, error) {
	rows, err := s.pool.Query(ctx, `
		select `+avatarColumns+` from public.avatars where user_id = $1
		order by is_default desc, created_at desc, id desc limit $2 offset $3`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]avatars.Avatar, 0, limit)
	for rows.Next() {
		a, err := scanAvatar(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *AvatarStore) CountPending(ctx context.Context, userID string) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx, `select count(*) from public.avatars where user_id = $1 and training_status = 'pending'`, userID).Scan(&n)
	return n, err
}

// SelectVoice only ever touches a row the user owns, and only a ready avatar.
func (s *AvatarStore) SelectVoice(ctx context.Context, userID, id, voiceID string) (avatars.Avatar, error) {
	a, err := scanAvatar(s.pool.QueryRow(ctx, `
		update public.avatars set selected_voice_id = $3, updated_at = now()
		where id = $1 and user_id = $2 and training_status = 'ready'
		returning `+avatarColumns, id, userID, voiceID))
	if errors.Is(err, avatars.ErrNotFound) {
		if _, getErr := s.Get(ctx, userID, id); getErr == nil {
			return avatars.Avatar{}, avatars.ErrNotReady
		}
	}
	return a, err
}

func scanAvatar(row pgx.Row) (avatars.Avatar, error) {
	var a avatars.Avatar
	err := row.Scan(&a.ID, &a.UserID, &a.Name, &a.IsDefault, &a.TrainingStatus, &a.StoragePath, &a.GroupID, &a.LookID,
		&a.TwinVoiceID, &a.VoiceID, &a.ConsentStatus, &a.ConsentURL, &a.ConsentExpiresAt, &a.PreviewImageURL,
		&a.PreviewVideoURL, &a.Error, &a.RerouteURL, &a.PollCount, &a.SubmitStartedAt, &a.FootageDeleted,
		&a.CreatedAt, &a.UpdatedAt, &a.TrainedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) || isInvalidUUID(err) {
			return avatars.Avatar{}, avatars.ErrNotFound
		}
		return avatars.Avatar{}, err
	}
	return a, nil
}

func isInvalidUUID(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == pgInvalidTextRepresentation
}
