package database

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/assets"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const assetColumns = `id::text, user_id::text, name, face_id, voice_id, product_id, environment_id,
	extras, face_consent_at, voice_consent_at, created_at, updated_at`

// AssetStore persists asset groups. Every read filters on user_id in SQL.
type AssetStore struct {
	pool *pgxpool.Pool
}

func NewAssetStore(pool *pgxpool.Pool) *AssetStore { return &AssetStore{pool: pool} }

// EmptyGroupTTL is how long a group may sit with nothing in it before it is
// removed. updated_at moves on every upload, so a group someone is filling is
// never touched.
const EmptyGroupTTL = 4 * time.Minute

// PruneEmpty deletes groups that hold no face, voice, product, environment or
// extra and have not changed for EmptyGroupTTL. An empty group owns no stored
// media, so removing the row is the whole cleanup. An empty userID prunes every
// user, which is what the background sweep uses.
func (s *AssetStore) PruneEmpty(ctx context.Context, userID string) (int64, error) {
	result, err := s.pool.Exec(ctx, `
		delete from public.asset_groups
		where ($1 = '' or user_id::text = $1)
		  and face_id = '' and voice_id = '' and product_id = '' and environment_id = ''
		  and extras = '[]'::jsonb
		  and updated_at < now() - make_interval(secs => $2)`, userID, EmptyGroupTTL.Seconds())
	if err != nil {
		return 0, mapError(err)
	}
	return result.RowsAffected(), nil
}

// RunPruner sweeps empty groups every interval until ctx ends.
func (s *AssetStore) RunPruner(ctx context.Context, every time.Duration) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			_, _ = s.PruneEmpty(ctx, "")
		}
	}
}

func (s *AssetStore) List(ctx context.Context, userID string) ([]assets.Group, error) {
	// Pruned on read too, so a stale empty group never appears in the list
	// while it waits for the next sweep. A failure here must not hide the list.
	_, _ = s.PruneEmpty(ctx, userID)
	rows, err := s.pool.Query(ctx, `
		select `+assetColumns+` from public.asset_groups
		where user_id = $1 order by created_at, id`, userID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	groups := make([]assets.Group, 0)
	for rows.Next() {
		group, err := scanGroup(rows)
		if err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}
	return groups, rows.Err()
}

func (s *AssetStore) Count(ctx context.Context, userID string) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx, `select count(*) from public.asset_groups where user_id = $1`, userID).Scan(&n)
	return n, err
}

func (s *AssetStore) Get(ctx context.Context, userID, id string) (assets.Group, error) {
	group, err := scanGroup(s.pool.QueryRow(ctx, `
		select `+assetColumns+` from public.asset_groups where id = $1 and user_id = $2`, id, userID))
	if err != nil {
		return assets.Group{}, assetErr(err)
	}
	return group, nil
}

func (s *AssetStore) Create(ctx context.Context, userID, name string) (assets.Group, error) {
	group, err := scanGroup(s.pool.QueryRow(ctx, `
		insert into public.asset_groups (user_id, name) values ($1, $2)
		returning `+assetColumns, userID, name))
	if err != nil {
		return assets.Group{}, assetErr(err)
	}
	return group, nil
}

func (s *AssetStore) Update(ctx context.Context, userID, id, name string, slots assets.Slots, extras []assets.Extra) (assets.Group, error) {
	extrasJSON, err := json.Marshal(extras)
	if err != nil {
		return assets.Group{}, err
	}
	group, err := scanGroup(s.pool.QueryRow(ctx, `
		update public.asset_groups set name = $3, face_id = $4, voice_id = $5,
			product_id = $6, environment_id = $7, extras = $8, updated_at = now()
		where id = $1 and user_id = $2
		returning `+assetColumns,
		id, userID, name, slots.Face, slots.Voice, slots.Product, slots.Environment, extrasJSON))
	if err != nil {
		return assets.Group{}, assetErr(err)
	}
	return group, nil
}

func (s *AssetStore) Delete(ctx context.Context, userID, id string) error {
	result, err := s.pool.Exec(ctx, `delete from public.asset_groups where id = $1 and user_id = $2`, id, userID)
	if err != nil {
		return mapError(err)
	}
	if result.RowsAffected() == 0 {
		return assets.ErrNotFound
	}
	return nil
}

func (s *AssetStore) Consent(ctx context.Context, userID, id, kind string) (assets.Group, error) {
	column := "face_consent_at"
	if kind == "voice" {
		column = "voice_consent_at"
	}
	group, err := scanGroup(s.pool.QueryRow(ctx, `
		update public.asset_groups set `+column+` = now(), updated_at = now()
		where id = $1 and user_id = $2
		returning `+assetColumns, id, userID))
	if err != nil {
		return assets.Group{}, assetErr(err)
	}
	return group, nil
}

// assetErr maps storage failures: missing or malformed ids read as not found,
// duplicate names as taken. The column name is fixed, so no injection.
func assetErr(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return assets.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case pgInvalidTextRepresentation:
			return assets.ErrNotFound
		case pgUniqueViolation:
			return assets.ErrNameTaken
		}
	}
	return err
}

func scanGroup(row pgx.Row) (assets.Group, error) {
	var (
		group      assets.Group
		extrasJSON []byte
	)
	err := row.Scan(&group.ID, &group.UserID, &group.Name,
		&group.Slots.Face, &group.Slots.Voice, &group.Slots.Product, &group.Slots.Environment,
		&extrasJSON, &group.FaceConsent, &group.VoiceConsent, &group.CreatedAt, &group.UpdatedAt)
	if err != nil {
		return assets.Group{}, mapError(err)
	}
	if err := json.Unmarshal(extrasJSON, &group.Extras); err != nil {
		return assets.Group{}, err
	}
	if group.Extras == nil {
		group.Extras = []assets.Extra{}
	}
	return group, nil
}
