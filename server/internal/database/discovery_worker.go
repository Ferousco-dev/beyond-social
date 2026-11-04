package database

import (
	"context"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
	"github.com/jackc/pgx/v5"
)

func (s *DiscoveryStore) Claim(ctx context.Context, limit int, lease time.Duration) ([]discovery.Discovery, error) {
	rows, err := s.pool.Query(ctx, `
		with due as (
			select id as due_id from public.discoveries
			where status in ('queued', 'running') and next_run_at <= now()
			order by next_run_at
			limit $1
			for update skip locked
		)
		update public.discoveries
		set next_run_at = now() + make_interval(secs => $2)
		from due
		where id = due.due_id
		returning `+discoveryColumns, limit, lease.Seconds())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var claimed []discovery.Discovery
	for rows.Next() {
		d, err := scanDiscovery(rows)
		if err != nil {
			return nil, err
		}
		claimed = append(claimed, d)
	}
	return claimed, rows.Err()
}

func (s *DiscoveryStore) Advance(ctx context.Context, id string, u discovery.Update) (discovery.Discovery, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return discovery.Discovery{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := lockOpen(ctx, tx, id); err != nil {
		return discovery.Discovery{}, err
	}
	updated, err := scanDiscovery(tx.QueryRow(ctx, `
		update public.discoveries
		set status = coalesce(nullif($2, ''), status),
		    apify_run_id = coalesce($3, apify_run_id),
		    error = case when $4 <> '' then $4 else error end,
		    retry_count = retry_count + $5,
		    next_run_at = case when coalesce(nullif($2, ''), status) in ('completed', 'failed')
		                       then null else coalesce($6, next_run_at) end,
		    completed_at = case when coalesce(nullif($2, ''), status) in ('completed', 'failed')
		                        then now() else completed_at end,
		    updated_at = now()
		where id = $1
		returning `+discoveryColumns, id, string(u.Status), u.RunID, u.Error, u.RetryDelta, u.NextRun))
	if err != nil {
		return discovery.Discovery{}, err
	}
	return updated, tx.Commit(ctx)
}

func (s *DiscoveryStore) Complete(ctx context.Context, id string, videos []video.Video) (discovery.Discovery, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return discovery.Discovery{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := lockOpen(ctx, tx, id); err != nil {
		return discovery.Discovery{}, err
	}

	batch := &pgx.Batch{}
	for i, v := range videos {
		batch.Queue(`
			insert into public.discovery_videos (discovery_id, user_id, platform, source_video_id, position, page_url, caption,
				creator_handle, creator_name, thumbnail_url, video_url, duration_seconds, view_count, like_count,
				comment_count, share_count, hashtags, published_at, discovered_at)
			select $1, user_id, $2, $3, $4, $5, $6, $7, $8, nullif($9, ''), nullif($10, ''), $11, $12, $13, $14, $15, $16, $17, $18
			from public.discoveries where id = $1
			on conflict (discovery_id, source_video_id) do nothing`,
			id, string(v.Platform), v.SourceID, i, v.PageURL, v.Caption, v.CreatorHandle, v.CreatorName,
			v.ThumbnailURL, v.VideoURL, v.DurationSeconds, v.ViewCount, v.LikeCount, v.CommentCount, v.ShareCount,
			v.Hashtags, v.PublishedAt, v.DiscoveredAt)
	}
	results := tx.SendBatch(ctx, batch)
	for range videos {
		if _, err := results.Exec(); err != nil {
			_ = results.Close()
			return discovery.Discovery{}, err
		}
	}
	if err := results.Close(); err != nil {
		return discovery.Discovery{}, err
	}

	done, err := scanDiscovery(tx.QueryRow(ctx, `
		update public.discoveries
		set status = 'completed', result_count = (select count(*) from public.discovery_videos where discovery_id = $1),
		    next_run_at = null, completed_at = now(), updated_at = now()
		where id = $1
		returning `+discoveryColumns, id))
	if err != nil {
		return discovery.Discovery{}, err
	}
	return done, tx.Commit(ctx)
}

// lockOpen locks the row and refuses to touch one that has already finished.
func lockOpen(ctx context.Context, tx pgx.Tx, id string) error {
	var status string
	if err := tx.QueryRow(ctx, `select status from public.discoveries where id = $1 for update`, id).Scan(&status); err != nil {
		return mapDiscoveryError(err)
	}
	if discovery.Status(status).Terminal() {
		return discovery.ErrFinished
	}
	return nil
}
