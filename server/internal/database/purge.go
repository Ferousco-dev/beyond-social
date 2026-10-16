package database

import (
	"context"
	"fmt"

	"github.com/Ferousco-dev/beyond-social/server/internal/purge"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PurgeStore implements purge.Store.
type PurgeStore struct{ pool *pgxpool.Pool }

func NewPurgeStore(pool *pgxpool.Pool) *PurgeStore { return &PurgeStore{pool: pool} }

// ErasedTables are the tables whose rows for a person are deleted, in an order
// that respects their references. KeptTables hold financial or legal records and
// are left alone. Every table with a user_id must be in one list; a test enforces it.
var (
	ErasedTables = []string{
		"post_metrics", "scheduled_posts", "editor_projects", "messages", "conversation_summaries", "conversations", "user_memories", "workflow_steps", "workflows",
		"discovery_videos", "discoveries", "jobs", "avatar_handoffs", "avatars", "social_oauth_states", "asset_groups", "cloned_voices",
		"social_connections", "media", "usage_events", "usage_state",
	}
	KeptTables = []string{"admin_audit_log", "credit_balances", "credit_ledger", "invoices", "payments", "subscriptions", "subscription_events"}
)

func (s *PurgeStore) Pending(ctx context.Context, limit int) ([]string, error) {
	rows, err := s.pool.Query(ctx, `select id::text from public.profiles where deleted_at is not null and purged_at is null order by deleted_at limit $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (s *PurgeStore) column(ctx context.Context, query, userID string) ([]string, error) {
	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *PurgeStore) Paths(ctx context.Context, userID string) (purge.Paths, error) {
	media, err := s.column(ctx, `select path from public.media where user_id = $1`, userID)
	if err != nil {
		return purge.Paths{}, err
	}
	footage, err := s.column(ctx, `select storage_path from public.avatars where user_id = $1 and storage_path is not null and footage_deleted_at is null`, userID)
	return purge.Paths{Media: media, Footage: footage}, err
}

func (s *PurgeStore) AvatarIDs(ctx context.Context, userID string) ([]string, error) {
	return s.column(ctx, `select id::text from public.avatars where user_id = $1`, userID)
}

func (s *PurgeStore) Erase(ctx context.Context, userID string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // rollback after commit is a no-op
	for _, table := range ErasedTables {
		// The names come from the list above, never from input.
		if _, err := tx.Exec(ctx, fmt.Sprintf(`delete from public.%s where user_id = $1`, table), userID); err != nil {
			return fmt.Errorf("erase %s: %w", table, err)
		}
	}
	// What is left of the profile is a stub the kept records point to.
	if _, err := tx.Exec(ctx, `
		update public.profiles
		set email = 'deleted-' || id::text || '@deleted.invalid', display_name = '', purged_at = now()
		where id = $1 and deleted_at is not null`, userID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
