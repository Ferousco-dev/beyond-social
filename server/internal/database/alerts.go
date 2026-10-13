package database

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const alertColumns = `id::text, kind, provider, message, coalesce(last_user_id::text, ''), coalesce(last_resource, ''),
	count, first_seen, last_seen, resolved_at`

// AlertStore implements alerts.Store.
type AlertStore struct {
	pool *pgxpool.Pool
}

func NewAlertStore(pool *pgxpool.Pool) *AlertStore { return &AlertStore{pool: pool} }

func (s *AlertStore) Record(ctx context.Context, a alerts.Alert) (alerts.Alert, bool, error) {
	var saved alerts.Alert
	var notify bool
	err := s.pool.QueryRow(ctx, `
		insert into public.admin_alerts (kind, provider, message, last_user_id, last_resource, notified_at)
		values ($1, $2, $3, nullif($4, '')::uuid, nullif($5, ''), now())
		on conflict (kind, provider) where resolved_at is null do update set
			count = admin_alerts.count + 1,
			last_seen = now(),
			message = excluded.message,
			last_user_id = excluded.last_user_id,
			last_resource = excluded.last_resource,
			notified_at = case when admin_alerts.notified_at is null or admin_alerts.notified_at < now() - interval '1 hour'
			                   then now() else admin_alerts.notified_at end
		returning `+alertColumns+`, notified_at = now()`,
		a.Kind, a.Provider, a.Message, a.UserID, a.Resource).
		Scan(&saved.ID, &saved.Kind, &saved.Provider, &saved.Message, &saved.UserID, &saved.Resource,
			&saved.Count, &saved.FirstSeen, &saved.LastSeen, &saved.ResolvedAt, &notify)
	return saved, notify, err
}

func (s *AlertStore) List(ctx context.Context, openOnly bool, limit int) ([]alerts.Alert, error) {
	rows, err := s.pool.Query(ctx, `
		select `+alertColumns+` from public.admin_alerts
		where not $1 or resolved_at is null
		order by last_seen desc limit $2`, openOnly, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []alerts.Alert{}
	for rows.Next() {
		var a alerts.Alert
		if err := rows.Scan(&a.ID, &a.Kind, &a.Provider, &a.Message, &a.UserID, &a.Resource,
			&a.Count, &a.FirstSeen, &a.LastSeen, &a.ResolvedAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *AlertStore) Resolve(ctx context.Context, id string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `update public.admin_alerts set resolved_at = now() where id = $1 and resolved_at is null`, id)
	if err != nil {
		if isInvalidUUID(err) || errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}
