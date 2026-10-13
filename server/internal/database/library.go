package database

import (
	"context"

	"github.com/Ferousco-dev/beyond-social/server/internal/library"
	"github.com/jackc/pgx/v5/pgxpool"
)

// LibraryStore implements library.Store over completed video jobs.
type LibraryStore struct{ pool *pgxpool.Pool }

func NewLibraryStore(pool *pgxpool.Pool) *LibraryStore { return &LibraryStore{pool: pool} }

func (s *LibraryStore) List(ctx context.Context, userID string, limit, offset int) ([]library.Item, error) {
	rows, err := s.pool.Query(ctx, `
		select id::text, job_type, coalesce(input->>'prompt', ''), result->>'video_url',
		       coalesce(result->>'thumbnail_url', ''),
		       coalesce(nullif(result->>'duration_seconds', '')::float8, 0),
		       coalesce(completed_at, created_at)
		from public.jobs
		where user_id = $1 and status = 'completed' and library_hidden_at is null
		  and job_type in ('video_generate', 'video_transform', 'avatar_video')
		  and result ? 'video_url'
		order by coalesce(completed_at, created_at) desc
		limit $2 offset $3`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []library.Item{}
	for rows.Next() {
		var it library.Item
		if err := rows.Scan(&it.ID, &it.Type, &it.Prompt, &it.VideoURL, &it.ThumbnailURL, &it.DurationSeconds, &it.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (s *LibraryStore) Hide(ctx context.Context, userID, id string) error {
	tag, err := s.pool.Exec(ctx, `
		update public.jobs set library_hidden_at = now()
		where id = $1 and user_id = $2 and status = 'completed' and library_hidden_at is null and result ? 'video_url'`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return library.ErrNotFound
	}
	return nil
}
