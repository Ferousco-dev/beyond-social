package database

import (
	"context"

	"github.com/Ferousco-dev/beyond-social/server/internal/monitoring"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MonitoringStore struct{ pool *pgxpool.Pool }

func NewMonitoringStore(pool *pgxpool.Pool) *MonitoringStore {
	return &MonitoringStore{pool: pool}
}

func (s *MonitoringStore) Snapshot(ctx context.Context) (monitoring.Snapshot, error) {
	snapshot := monitoring.Snapshot{RecentFailureDays: 7, RecentFailures: []monitoring.Failure{}}
	err := s.pool.QueryRow(ctx, `
		select count(*) filter (where status = 'queued')::int,
		       count(*) filter (where status = 'running')::int,
		       count(*) filter (where status = 'completed')::int,
		       count(*) filter (where status = 'failed')::int,
		       count(*) filter (where status = 'ready')::int,
		       min(created_at) filter (where status = 'queued'),
		       min(started_at) filter (where status = 'running')
		from public.jobs`).Scan(
		&snapshot.Jobs.Queued, &snapshot.Jobs.Running, &snapshot.Jobs.Completed,
		&snapshot.Jobs.Failed, &snapshot.Jobs.Ready,
		&snapshot.Jobs.OldestQueuedAt, &snapshot.Jobs.OldestRunningAt,
	)
	if err != nil {
		return monitoring.Snapshot{}, err
	}
	err = s.pool.QueryRow(ctx, `
		select count(*) filter (where status = 'preparing')::int,
		       count(*) filter (where status = 'scheduled')::int,
		       count(*) filter (where status = 'publishing')::int,
		       count(*) filter (where status = 'published')::int,
		       count(*) filter (where status = 'failed')::int,
		       count(*) filter (where status = 'cancelled')::int
		from public.scheduled_posts`).Scan(
		&snapshot.Posts.Preparing, &snapshot.Posts.Scheduled, &snapshot.Posts.Publishing,
		&snapshot.Posts.Published, &snapshot.Posts.Failed, &snapshot.Posts.Cancelled,
	)
	if err != nil {
		return monitoring.Snapshot{}, err
	}
	err = s.pool.QueryRow(ctx, `
		select count(*)::int, coalesce(sum(size_bytes), 0)
		from public.media where ready_at is not null`).Scan(&snapshot.Storage.MediaObjects, &snapshot.Storage.MediaBytes)
	if err != nil {
		return monitoring.Snapshot{}, err
	}
	rows, err := s.pool.Query(ctx, `
		select source, name, message, occurred_at from (
			select 'generation'::text as source, job_type as name, coalesce(error, '') as message, updated_at as occurred_at
			from public.jobs where status = 'failed' and updated_at >= now() - interval '7 days'
			union all
			select 'publishing', platform, coalesce(error, ''), updated_at
			from public.scheduled_posts where status = 'failed' and updated_at >= now() - interval '7 days'
		) failures order by occurred_at desc limit 20`)
	if err != nil {
		return monitoring.Snapshot{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var failure monitoring.Failure
		if err := rows.Scan(&failure.Source, &failure.Name, &failure.Message, &failure.At); err != nil {
			return monitoring.Snapshot{}, err
		}
		snapshot.RecentFailures = append(snapshot.RecentFailures, failure)
	}
	if err := rows.Err(); err != nil {
		return monitoring.Snapshot{}, err
	}
	return snapshot, nil
}
