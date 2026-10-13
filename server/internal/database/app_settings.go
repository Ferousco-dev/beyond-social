package database

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SettingsStore keeps admin-editable text settings.
type SettingsStore struct{ pool *pgxpool.Pool }

func NewSettingsStore(pool *pgxpool.Pool) *SettingsStore { return &SettingsStore{pool: pool} }

// Get returns a setting, and whether it has been set.
func (s *SettingsStore) Get(ctx context.Context, key string) (string, bool, error) {
	var value string
	err := s.pool.QueryRow(ctx, `select value from public.app_settings where key = $1`, key).Scan(&value)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, nil
	}
	return value, err == nil, err
}

func (s *SettingsStore) Set(ctx context.Context, key, value, actor string) error {
	_, err := s.pool.Exec(ctx, `
		insert into public.app_settings (key, value, updated_by) values ($1, $2, nullif($3, '')::uuid)
		on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`, key, value, actor)
	return err
}
