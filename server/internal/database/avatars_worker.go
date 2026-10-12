package database

import (
	"context"
	"errors"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/jackc/pgx/v5"
)

// Claim leases due avatars. Besides pending ones it picks up finished avatars
// whose recording has not been deleted yet, so deletion is retried.
func (s *AvatarStore) Claim(ctx context.Context, limit int, lease time.Duration) ([]avatars.Avatar, error) {
	rows, err := s.pool.Query(ctx, `
		with due as (
			select id as due_id from public.avatars
			where next_run_at <= now()
			order by next_run_at
			limit $1
			for update skip locked
		)
		update public.avatars
		set next_run_at = now() + make_interval(secs => $2)
		from due
		where id = due.due_id
		returning `+avatarColumns, limit, lease.Seconds())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []avatars.Avatar
	for rows.Next() {
		a, err := scanAvatar(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// Advance locks the row and applies one worker update. A row that already
// finished rejects it, which makes repeated or late updates harmless.
func (s *AvatarStore) Advance(ctx context.Context, id string, u avatars.Update) (avatars.Avatar, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return avatars.Avatar{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var status string
	if err := tx.QueryRow(ctx, `select training_status from public.avatars where id = $1 for update`, id).Scan(&status); err != nil {
		return avatars.Avatar{}, mapAvatarErr(err)
	}
	if status != "pending" {
		return avatars.Avatar{}, avatars.ErrFinished
	}

	updated, err := scanAvatar(tx.QueryRow(ctx, `
		update public.avatars set
			training_status = coalesce(nullif($2, ''), training_status),
			provider_avatar_id = coalesce($3, provider_avatar_id),
			provider_look_id = coalesce($4, provider_look_id),
			provider_voice_id = coalesce(nullif($5, ''), provider_voice_id),
			selected_voice_id = coalesce(selected_voice_id, nullif($6, '')),
			provider_consent_status = coalesce($7, provider_consent_status),
			provider_consent_url = case when $8::text is null then provider_consent_url else nullif($8, '') end,
			provider_consent_url_expires_at = case when $8::text is null then provider_consent_url_expires_at
			                                       else $9 end,
			provider_preview_image_url = coalesce(nullif($10, ''), provider_preview_image_url),
			provider_preview_video_url = coalesce(nullif($11, ''), provider_preview_video_url),
			provider_error = case when $12 <> '' then $12 when $2 = 'ready' then null else provider_error end,
			submit_started_at = case when $13 then coalesce(submit_started_at, now()) else submit_started_at end,
			trained_at = case when $14 then now() else trained_at end,
			poll_count = poll_count + $15,
			next_run_at = coalesce($16, next_run_at),
			updated_at = now()
		where id = $1
		returning `+avatarColumns,
		id, u.TrainingStatus, u.GroupID, u.LookID, deref(u.TwinVoiceID), deref(u.SelectedVoiceID), u.ConsentStatus,
		u.ConsentURL, u.ConsentExpires, deref(u.PreviewImage), deref(u.PreviewVideo), u.Error, u.MarkSubmitting,
		u.MarkTrained, u.PollDelta, u.NextRun))
	if err != nil {
		return avatars.Avatar{}, err
	}
	return updated, tx.Commit(ctx)
}

// FootageGone records that the source recording has been deleted, or schedules
// another attempt. A nil retryAt ends the schedule for the row.
func (s *AvatarStore) FootageGone(ctx context.Context, id string, retryAt *time.Time) error {
	_, err := s.pool.Exec(ctx, `
		update public.avatars set
			footage_deleted_at = case when $2::timestamptz is null then coalesce(footage_deleted_at, now()) else footage_deleted_at end,
			storage_path = case when $2::timestamptz is null then null else storage_path end,
			next_run_at = $2, updated_at = now()
		where id = $1 and training_status <> 'pending'`, id, retryAt)
	return err
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func mapAvatarErr(err error) error {
	if errors.Is(err, pgx.ErrNoRows) || isInvalidUUID(err) {
		return avatars.ErrNotFound
	}
	return err
}
