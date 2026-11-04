package database

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// The file kind comes from the media row, so a listing needs no second lookup.
const assetLibraryColumns = `a.id::text, a.user_id::text, a.kind, a.label, a.media_id::text, a.consent_at, a.created_at, coalesce(m.kind, '')`

const assetLibraryFrom = ` from public.library_assets a left join public.media m on m.id = a.media_id`

// AssetLibraryStore persists library assets. Every read filters on user_id in SQL.
type AssetLibraryStore struct {
	pool *pgxpool.Pool
}

func NewAssetLibraryStore(pool *pgxpool.Pool) *AssetLibraryStore {
	return &AssetLibraryStore{pool: pool}
}

func (s *AssetLibraryStore) List(ctx context.Context, userID string) ([]assetlib.Asset, error) {
	rows, err := s.pool.Query(ctx, `select `+assetLibraryColumns+assetLibraryFrom+`
		where a.user_id = $1 order by a.created_at desc, a.id`, userID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	list := make([]assetlib.Asset, 0)
	for rows.Next() {
		asset, err := scanAsset(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, asset)
	}
	return list, rows.Err()
}

func (s *AssetLibraryStore) Get(ctx context.Context, userID, id string) (assetlib.Asset, error) {
	return s.one(ctx, `select `+assetLibraryColumns+assetLibraryFrom+` where a.id = $1 and a.user_id = $2`, id, userID)
}

func (s *AssetLibraryStore) Create(ctx context.Context, asset assetlib.Asset) (assetlib.Asset, error) {
	var id string
	err := s.pool.QueryRow(ctx, `
		insert into public.library_assets (user_id, kind, label, media_id) values ($1, $2, $3, $4)
		returning id::text`, asset.UserID, asset.Kind, asset.Label, asset.MediaID).Scan(&id)
	if err != nil {
		return assetlib.Asset{}, assetLibraryErr(err)
	}
	return s.Get(ctx, asset.UserID, id)
}

func (s *AssetLibraryStore) Relabel(ctx context.Context, userID, id, label string) (assetlib.Asset, error) {
	return s.touch(ctx, userID, id, `label = $3`, label)
}

func (s *AssetLibraryStore) Consent(ctx context.Context, userID, id string) (assetlib.Asset, error) {
	return s.touch(ctx, userID, id, `consent_at = coalesce(consent_at, now())`)
}

func (s *AssetLibraryStore) Delete(ctx context.Context, userID, id string) error {
	result, err := s.pool.Exec(ctx, `delete from public.library_assets where id = $1 and user_id = $2`, id, userID)
	if err != nil {
		return assetLibraryErr(err)
	}
	if result.RowsAffected() == 0 {
		return assetlib.ErrNotFound
	}
	return nil
}

// touch applies one fixed assignment, then rereads the row with its file kind.
func (s *AssetLibraryStore) touch(ctx context.Context, userID, id, set string, args ...any) (assetlib.Asset, error) {
	result, err := s.pool.Exec(ctx, `update public.library_assets set `+set+`, updated_at = now()
		where id = $1 and user_id = $2`, append([]any{id, userID}, args...)...)
	if err != nil {
		return assetlib.Asset{}, assetLibraryErr(err)
	}
	if result.RowsAffected() == 0 {
		return assetlib.Asset{}, assetlib.ErrNotFound
	}
	return s.Get(ctx, userID, id)
}

func (s *AssetLibraryStore) one(ctx context.Context, query string, args ...any) (assetlib.Asset, error) {
	asset, err := scanAsset(s.pool.QueryRow(ctx, query, args...))
	if err != nil {
		return assetlib.Asset{}, assetLibraryErr(err)
	}
	return asset, nil
}

// assetLibraryErr maps storage failures: missing or malformed ids read as not
// found, a repeated label within a kind as taken.
func assetLibraryErr(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return assetlib.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case pgInvalidTextRepresentation:
			return assetlib.ErrNotFound
		case pgUniqueViolation:
			return assetlib.ErrLabelTaken
		}
	}
	return err
}

func scanAsset(row pgx.Row) (assetlib.Asset, error) {
	var asset assetlib.Asset
	var kind string
	err := row.Scan(&asset.ID, &asset.UserID, &kind, &asset.Label, &asset.MediaID, &asset.ConsentAt, &asset.CreatedAt, &asset.FileKind)
	asset.Kind = assetlib.Kind(kind)
	return asset, err
}
