package database

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MediaStore implements media.Store. Reads filter on user_id in SQL, so a file
// that belongs to someone else is indistinguishable from one that does not exist.
type MediaStore struct {
	pool *pgxpool.Pool
}

func NewMediaStore(pool *pgxpool.Pool) *MediaStore { return &MediaStore{pool: pool} }

const mediaColumns = `id::text, user_id::text, kind, name, mime_type, size_bytes, path, ready_at is not null, created_at`

func scanMedia(row pgx.Row) (media.Item, error) {
	var i media.Item
	var kind string
	err := row.Scan(&i.ID, &i.UserID, &kind, &i.Name, &i.MIME, &i.Size, &i.Path, &i.Ready, &i.CreatedAt)
	i.Kind = media.Kind(kind)
	if errors.Is(err, pgx.ErrNoRows) || isInvalidText(err) {
		return media.Item{}, media.ErrNotFound
	}
	return i, err
}

func (s *MediaStore) Create(ctx context.Context, i media.Item) (media.Item, error) {
	return scanMedia(s.pool.QueryRow(ctx, `
		insert into public.media (id, user_id, kind, name, mime_type, size_bytes, path)
		values ($1, $2, $3, $4, $5, $6, $7)
		returning `+mediaColumns, i.ID, i.UserID, string(i.Kind), i.Name, i.MIME, i.Size, i.Path))
}

func (s *MediaStore) Get(ctx context.Context, userID, id string) (media.Item, error) {
	return scanMedia(s.pool.QueryRow(ctx, `select `+mediaColumns+` from public.media where id = $1 and user_id = $2`, id, userID))
}

func (s *MediaStore) MarkReady(ctx context.Context, id string, size int64) error {
	_, err := s.pool.Exec(ctx, `update public.media set ready_at = coalesce(ready_at, now()), size_bytes = $2 where id = $1`, id, size)
	return err
}
