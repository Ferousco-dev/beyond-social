package database

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/library"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// LibraryStore implements library.Store over completed video jobs.
type LibraryStore struct{ pool *pgxpool.Pool }

func NewLibraryStore(pool *pgxpool.Pool) *LibraryStore { return &LibraryStore{pool: pool} }

const libraryColumns = `j.id::text, j.job_type, coalesce(j.input->>'prompt', ''), j.result->>'video_url',
	coalesce(j.result->>'thumbnail_url', ''),
	coalesce(nullif(j.result->>'duration_seconds', '')::float8, 0),
	coalesce(j.completed_at, j.created_at)`

const libraryFinished = `j.user_id = $1 and j.status = 'completed' and j.library_hidden_at is null
	and j.job_type in ('video_generate', 'video_transform', 'avatar_video', 'talking_photo') and j.result ? 'video_url'`

func (s *LibraryStore) List(ctx context.Context, userID string, limit, offset int) ([]library.Item, error) {
	return s.items(ctx, `select `+libraryColumns+` from public.jobs j where `+libraryFinished+`
		order by coalesce(j.completed_at, j.created_at) desc limit $2 offset $3`, userID, limit, offset)
}

// ListForConversation finds the videos made by plans a chat proposed. A plan's
// step records the job it started, and the chat message names the plan.
func (s *LibraryStore) ListForConversation(ctx context.Context, userID, conversationID string, limit int) ([]library.Item, error) {
	return s.items(ctx, `select `+libraryColumns+` from public.jobs j where `+libraryFinished+`
		and exists (
			select 1 from public.workflow_steps ws
			join public.messages m on m.workflow_id = ws.workflow_id
			where ws.user_id = $1 and m.user_id = $1 and m.conversation_id::text = $2
			  and ws.output->>'ref' = j.id::text)
		order by coalesce(j.completed_at, j.created_at) desc limit $3`, userID, conversationID, limit)
}

func (s *LibraryStore) items(ctx context.Context, query string, args ...any) ([]library.Item, error) {
	rows, err := s.pool.Query(ctx, query, args...)
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

func (s *LibraryStore) Video(ctx context.Context, userID, id string) (library.Item, error) {
	var it library.Item
	err := s.pool.QueryRow(ctx, `
		select id::text, job_type, coalesce(input->>'prompt', ''), result->>'video_url', coalesce(completed_at, created_at)
		from public.jobs
		where id = $1 and user_id = $2 and status = 'completed'
		  and job_type in ('video_generate', 'video_transform', 'avatar_video', 'talking_photo') and result ? 'video_url'`, id, userID).
		Scan(&it.ID, &it.Type, &it.Prompt, &it.VideoURL, &it.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) || isInvalidText(err) {
		return library.Item{}, library.ErrNotFound
	}
	return it, err
}
