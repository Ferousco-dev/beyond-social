package database

import (
	"context"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
)

func (s *AvatarStore) Delete(ctx context.Context, userID, id string) (bool, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var wasDefault bool
	err = tx.QueryRow(ctx, `delete from public.avatars where id = $1 and user_id = $2 returning is_default`, id, userID).Scan(&wasDefault)
	if err != nil {
		if mapAvatarErr(err) == avatars.ErrNotFound {
			return false, nil
		}
		return false, err
	}
	if wasDefault {
		// Hand the default to the newest ready avatar, so there is always one to use.
		if _, err := tx.Exec(ctx, `
			update public.avatars set is_default = true
			where id = (select id from public.avatars
			            where user_id = $1 and training_status = 'ready' order by created_at desc limit 1)`, userID); err != nil {
			return false, err
		}
	}
	return true, tx.Commit(ctx)
}

func (s *AvatarStore) SetDefault(ctx context.Context, userID, id string) (avatars.Avatar, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return avatars.Avatar{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var status string
	if err := tx.QueryRow(ctx, `select training_status from public.avatars where id = $1 and user_id = $2 for update`, id, userID).Scan(&status); err != nil {
		return avatars.Avatar{}, mapAvatarErr(err)
	}
	if status != "ready" {
		return avatars.Avatar{}, avatars.ErrNotReady
	}
	// Two statements: the one-default-per-user index would reject the moment
	// where both the old and new default are set.
	if _, err := tx.Exec(ctx, `update public.avatars set is_default = false where user_id = $1 and is_default`, userID); err != nil {
		return avatars.Avatar{}, err
	}
	a, err := scanAvatar(tx.QueryRow(ctx, `update public.avatars set is_default = true, updated_at = now() where id = $1 returning `+avatarColumns, id))
	if err != nil {
		return avatars.Avatar{}, err
	}
	return a, tx.Commit(ctx)
}

func (s *AvatarStore) VoiceInUse(ctx context.Context, voiceID, exceptAvatarID string) (bool, error) {
	var used bool
	err := s.pool.QueryRow(ctx, `
		select exists (select 1 from public.avatars where provider_voice_id = $1 and id <> $2)`, voiceID, exceptAvatarID).Scan(&used)
	return used, err
}
