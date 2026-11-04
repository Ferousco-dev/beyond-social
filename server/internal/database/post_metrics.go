package database

import (
	"context"
	"errors"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/insights"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MetricsStore persists engagement snapshots. Reads filter on user_id in SQL.
type MetricsStore struct {
	pool *pgxpool.Pool
}

func NewMetricsStore(pool *pgxpool.Pool) *MetricsStore { return &MetricsStore{pool: pool} }

func (s *MetricsStore) Insert(ctx context.Context, userID, postID string, views, likes, comments, shares int64) (insights.Metrics, error) {
	return scanMetrics(s.pool.QueryRow(ctx, `
		insert into public.post_metrics (post_id, user_id, views, likes, comments, shares)
		values ($1, $2, $3, $4, $5, $6)
		returning post_id::text, views, likes, comments, shares, collected_at`,
		postID, userID, views, likes, comments, shares))
}

func (s *MetricsStore) Latest(ctx context.Context, userID, postID string) (insights.Metrics, error) {
	metrics, err := scanMetrics(s.pool.QueryRow(ctx, `
		select post_id::text, views, likes, comments, shares, collected_at
		from public.post_metrics where post_id = $1 and user_id = $2
		order by collected_at desc limit 1`, postID, userID))
	if errors.Is(err, jobs.ErrNotFound) {
		return insights.Metrics{}, insights.ErrNoMetrics
	}
	return metrics, err
}

func (s *MetricsStore) History(ctx context.Context, userID, postID string, limit int) ([]insights.Metrics, error) {
	rows, err := s.pool.Query(ctx, `
		select post_id::text, views, likes, comments, shares, collected_at
		from public.post_metrics where post_id = $1 and user_id = $2
		order by collected_at desc limit $3`, postID, userID, limit)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	out := make([]insights.Metrics, 0)
	for rows.Next() {
		metrics, err := scanMetrics(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, metrics)
	}
	return out, rows.Err()
}

// Samples pairs each published post's send time with its newest standing, for
// the recommender. Posts without snapshots contribute nothing.
func (s *MetricsStore) Samples(ctx context.Context, userID string, platform social.Platform, days int) ([]insights.Sample, error) {
	rows, err := s.pool.Query(ctx, `
		select p.scheduled_at, m.views, m.likes, m.comments, m.shares
		from public.scheduled_posts p
		join (
			select distinct on (post_id) post_id, views, likes, comments, shares
			from public.post_metrics order by post_id, collected_at desc
		) m on m.post_id = p.id
		where p.user_id = $1 and p.platform = $2 and p.status = 'published'
			and p.scheduled_at > now() - make_interval(days => $3)`, userID, string(platform), days)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	var out []insights.Sample
	for rows.Next() {
		var sample insights.Sample
		if err := rows.Scan(&sample.ScheduledAt, &sample.Views, &sample.Likes, &sample.Comments, &sample.Shares); err != nil {
			return nil, err
		}
		out = append(out, sample)
	}
	return out, rows.Err()
}

// DuePublished lists published posts with an id whose newest snapshot is older
// than staleBefore, or that have none. The collector owns this query: it runs
// across users, and ownership is enforced when the rows are read per post.
func (s *MetricsStore) DuePublished(ctx context.Context, staleBefore time.Time, limit int) ([]insights.DuePost, error) {
	rows, err := s.pool.Query(ctx, `
		select p.id::text, p.user_id::text, p.platform, coalesce(p.external_id, '')
		from public.scheduled_posts p
		where p.status = 'published' and coalesce(p.external_id, '') <> ''
			and not exists (
				select 1 from public.post_metrics m
				where m.post_id = p.id and m.collected_at > $1
			)
		order by p.scheduled_at desc limit $2`, staleBefore, limit)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	var out []insights.DuePost
	for rows.Next() {
		var (
			post     insights.DuePost
			platform string
		)
		if err := rows.Scan(&post.ID, &post.UserID, &platform, &post.ExternalID); err != nil {
			return nil, err
		}
		post.Platform = social.Platform(platform)
		out = append(out, post)
	}
	return out, rows.Err()
}

func scanMetrics(row pgx.Row) (insights.Metrics, error) {
	var metrics insights.Metrics
	if err := row.Scan(&metrics.PostID, &metrics.Views, &metrics.Likes, &metrics.Comments, &metrics.Shares, &metrics.CollectedAt); err != nil {
		return insights.Metrics{}, mapError(err)
	}
	return metrics, nil
}
