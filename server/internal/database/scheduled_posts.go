package database

import (
	"context"
	"errors"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/publish"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostStore implements publish.Store. User-facing reads filter on user_id in
// SQL, so ownership does not depend on the HTTP layer.
type PostStore struct {
	pool *pgxpool.Pool
}

func NewPostStore(pool *pgxpool.Pool) *PostStore { return &PostStore{pool: pool} }

const postColumns = `id::text, user_id::text, platform, title, caption, visibility, source_url, coalesce(job_id::text, ''),
	coalesce(storage_path, ''), scheduled_at, status, attempts, next_run_at, publish_started_at,
	coalesce(external_id, ''), coalesce(external_url, ''), coalesce(error, ''), created_at`

func scanPost(row pgx.Row) (publish.Post, error) {
	var p publish.Post
	var platform, status string
	err := row.Scan(&p.ID, &p.UserID, &platform, &p.Title, &p.Caption, &p.Visibility, &p.SourceURL, &p.JobID,
		&p.StoragePath, &p.ScheduledAt, &status, &p.Attempts, &p.NextRunAt, &p.PublishStartedAt,
		&p.ExternalID, &p.ExternalURL, &p.Error, &p.CreatedAt)
	p.Platform, p.Status = social.Platform(platform), publish.Status(status)
	if errors.Is(err, pgx.ErrNoRows) || isInvalidText(err) {
		return publish.Post{}, publish.ErrNotFound
	}
	return p, err
}

func (s *PostStore) Create(ctx context.Context, p publish.Post, key string) (publish.Post, bool, error) {
	created, err := scanPost(s.pool.QueryRow(ctx, `
		insert into public.scheduled_posts (user_id, platform, title, caption, visibility, source_url, job_id, scheduled_at, status, next_run_at, idempotency_key)
		values ($1, $2, $3, $4, $5, $6, nullif($7, '')::uuid, $8, 'preparing', now(), nullif($9, ''))
		on conflict (user_id, idempotency_key) where idempotency_key is not null do nothing
		returning `+postColumns, p.UserID, string(p.Platform), p.Title, p.Caption, p.Visibility, p.SourceURL, p.JobID, p.ScheduledAt, key))
	if err == nil {
		return created, true, nil
	}
	if !errors.Is(err, publish.ErrNotFound) {
		return publish.Post{}, false, err
	}
	existing, err := scanPost(s.pool.QueryRow(ctx, `select `+postColumns+` from public.scheduled_posts where user_id = $1 and idempotency_key = $2`, p.UserID, key))
	return existing, false, err
}

func (s *PostStore) Get(ctx context.Context, userID, id string) (publish.Post, error) {
	return scanPost(s.pool.QueryRow(ctx, `select `+postColumns+` from public.scheduled_posts where id = $1 and user_id = $2`, id, userID))
}

func (s *PostStore) List(ctx context.Context, userID string, limit, offset int) ([]publish.Post, error) {
	rows, err := s.pool.Query(ctx, `
		select `+postColumns+` from public.scheduled_posts where user_id = $1
		order by scheduled_at desc, id limit $2 offset $3`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []publish.Post{}
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *PostStore) CountOpen(ctx context.Context, userID string) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx, `select count(*)::int from public.scheduled_posts where user_id = $1 and status in ('preparing', 'scheduled', 'publishing')`, userID).Scan(&n)
	return n, err
}

func (s *PostStore) Cancel(ctx context.Context, userID, id string) (publish.Post, error) {
	p, err := scanPost(s.pool.QueryRow(ctx, `
		update public.scheduled_posts set status = 'cancelled', next_run_at = null, updated_at = now()
		where id = $1 and user_id = $2 and status in ('preparing', 'scheduled') and publish_started_at is null
		returning `+postColumns, id, userID))
	if !errors.Is(err, publish.ErrNotFound) {
		return p, err
	}
	// Either it is not theirs, or it is no longer cancellable. Tell them apart.
	if _, getErr := s.Get(ctx, userID, id); getErr != nil {
		return publish.Post{}, getErr
	}
	return publish.Post{}, publish.ErrNotCancellable
}

// Claim leases due posts. A claimed post's next_run_at moves out by the lease,
// so one that its worker never finished becomes due again by itself.
func (s *PostStore) Claim(ctx context.Context, limit int, lease time.Duration) ([]publish.Post, error) {
	rows, err := s.pool.Query(ctx, `
		update public.scheduled_posts set next_run_at = now() + make_interval(secs => $2), updated_at = now()
		where id in (
			select id from public.scheduled_posts
			where status in ('preparing', 'scheduled', 'publishing') and next_run_at <= now()
			order by next_run_at limit $1 for update skip locked)
		returning `+postColumns, limit, lease.Seconds())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []publish.Post{}
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// Advance applies a worker's change, and refuses to touch a post that already
// ended: a late worker cannot undo a cancel or overwrite a result.
func (s *PostStore) Advance(ctx context.Context, id string, u publish.Update) (publish.Post, error) {
	status := string(u.Status)
	terminal := u.Status.Terminal()
	return scanPost(s.pool.QueryRow(ctx, `
		update public.scheduled_posts set
			status = coalesce(nullif($2, ''), status),
			storage_path = coalesce($3, storage_path),
			next_run_at = case when $9 then null else coalesce($4, next_run_at) end,
			publish_started_at = case when $5 then coalesce(publish_started_at, now()) else publish_started_at end,
			external_id = coalesce(nullif($6, ''), external_id),
			external_url = coalesce(nullif($7, ''), external_url),
			error = coalesce(nullif($8, ''), error),
			attempts = attempts + $10,
			updated_at = now()
		where id = $1 and status in ('preparing', 'scheduled', 'publishing')
		returning `+postColumns, id, status, u.StoragePath, u.NextRun, u.MarkStarted, u.ExternalID, u.ExternalURL, u.Error, terminal, u.AttemptsDelta))
}
