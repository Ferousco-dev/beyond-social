package database

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// The group methods live on the library store, so an asset and its group are
// always read with the same owner check.

func (s *AssetLibraryStore) ListGroups(ctx context.Context, userID string) ([]assetlib.Group, error) {
	rows, err := s.pool.Query(ctx, `
		select id::text, name, created_at from public.library_groups
		where user_id = $1 order by lower(name), id`, userID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	list := make([]assetlib.Group, 0)
	for rows.Next() {
		var g assetlib.Group
		if err := rows.Scan(&g.ID, &g.Name, &g.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, g)
	}
	return list, rows.Err()
}

func (s *AssetLibraryStore) CreateGroup(ctx context.Context, userID, name string) (assetlib.Group, error) {
	var g assetlib.Group
	err := s.pool.QueryRow(ctx, `
		insert into public.library_groups (user_id, name) values ($1, $2)
		returning id::text, name, created_at`, userID, name).Scan(&g.ID, &g.Name, &g.CreatedAt)
	return g, groupErr(err)
}

func (s *AssetLibraryStore) RenameGroup(ctx context.Context, userID, id, name string) (assetlib.Group, error) {
	var g assetlib.Group
	err := s.pool.QueryRow(ctx, `
		update public.library_groups set name = $3, updated_at = now()
		where id = $1 and user_id = $2
		returning id::text, name, created_at`, id, userID, name).Scan(&g.ID, &g.Name, &g.CreatedAt)
	return g, groupErr(err)
}

func (s *AssetLibraryStore) DeleteGroup(ctx context.Context, userID, id string) error {
	result, err := s.pool.Exec(ctx, `delete from public.library_groups where id = $1 and user_id = $2`, id, userID)
	if err != nil {
		return groupErr(err)
	}
	if result.RowsAffected() == 0 {
		return assetlib.ErrGroupNotFound
	}
	return nil
}

// Assign files an asset in a group. The group must belong to the same person
// as the asset; anyone else's group reads as not found.
func (s *AssetLibraryStore) Assign(ctx context.Context, userID, assetID, groupID string) (assetlib.Asset, error) {
	if groupID != "" {
		var owned bool
		err := s.pool.QueryRow(ctx, `select exists (select 1 from public.library_groups where id = $1 and user_id = $2)`, groupID, userID).Scan(&owned)
		if err != nil {
			return assetlib.Asset{}, groupErr(err)
		}
		if !owned {
			return assetlib.Asset{}, assetlib.ErrGroupNotFound
		}
		return s.touch(ctx, userID, assetID, `group_id = $3::uuid`, groupID)
	}
	return s.touch(ctx, userID, assetID, `group_id = null`)
}

func groupErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return assetlib.ErrGroupNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case pgInvalidTextRepresentation:
			return assetlib.ErrGroupNotFound
		case pgUniqueViolation:
			return assetlib.ErrGroupNameTaken
		}
	}
	return err
}
