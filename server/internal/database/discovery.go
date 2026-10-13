package database

import (
	"context"

	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	discoveryColumns = `id::text, user_id::text, platform, kind, query, requested_limit, status, result_count,
		error, created_at, updated_at, completed_at, coalesce(apify_run_id, ''), retry_count`

	videoColumns = `id::text, platform, source_video_id, page_url, coalesce(caption, ''), coalesce(creator_handle, ''),
		coalesce(creator_name, ''), coalesce(thumbnail_url, ''), coalesce(video_url, ''), duration_seconds,
		view_count, like_count, comment_count, share_count, hashtags, published_at, discovered_at`
)

// DiscoveryStore implements discovery.Repository.
type DiscoveryStore struct {
	pool *pgxpool.Pool
}

func NewDiscoveryStore(pool *pgxpool.Pool) *DiscoveryStore { return &DiscoveryStore{pool: pool} }

func (s *DiscoveryStore) Create(ctx context.Context, d discovery.Discovery) (discovery.Discovery, error) {
	return scanDiscovery(s.pool.QueryRow(ctx, `
		insert into public.discoveries (user_id, platform, kind, query, requested_limit, status, next_run_at)
		values ($1, $2, $3, $4, $5, 'queued', now())
		returning `+discoveryColumns, d.UserID, string(d.Platform), string(d.Kind), d.Query, d.RequestedLimit))
}

func (s *DiscoveryStore) Get(ctx context.Context, userID, id string) (discovery.Discovery, error) {
	return scanDiscovery(s.pool.QueryRow(ctx, `
		select `+discoveryColumns+` from public.discoveries where id = $1 and user_id = $2`, id, userID))
}

func (s *DiscoveryStore) ListVideos(ctx context.Context, userID, discoveryID string, limit, offset int) ([]video.Video, error) {
	rows, err := s.pool.Query(ctx, `
		select `+videoColumns+` from public.discovery_videos
		where discovery_id = $1 and user_id = $2
		order by position
		limit $3 offset $4`, discoveryID, userID, limit, offset)
	if err != nil {
		return nil, mapDiscoveryError(err)
	}
	defer rows.Close()
	videos := make([]video.Video, 0, limit)
	for rows.Next() {
		v, err := scanVideo(rows)
		if err != nil {
			return nil, err
		}
		videos = append(videos, v)
	}
	return videos, mapDiscoveryError(rows.Err())
}

func (s *DiscoveryStore) GetVideo(ctx context.Context, userID, videoID string) (video.Video, error) {
	return scanVideo(s.pool.QueryRow(ctx, `
		select `+videoColumns+` from public.discovery_videos where id = $1 and user_id = $2`, videoID, userID))
}

func (s *DiscoveryStore) CountActive(ctx context.Context, userID string) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx, `
		select count(*) from public.discoveries where user_id = $1 and status in ('queued', 'running')`, userID).Scan(&n)
	return n, err
}

func scanDiscovery(row pgx.Row) (discovery.Discovery, error) {
	var d discovery.Discovery
	var platform, kind, status string
	var errMsg *string
	err := row.Scan(&d.ID, &d.UserID, &platform, &kind, &d.Query, &d.RequestedLimit, &status, &d.ResultCount,
		&errMsg, &d.CreatedAt, &d.UpdatedAt, &d.CompletedAt, &d.ApifyRunID, &d.RetryCount)
	if err != nil {
		return discovery.Discovery{}, mapDiscoveryError(err)
	}
	d.Platform, d.Kind, d.Status = video.Platform(platform), discovery.Kind(kind), discovery.Status(status)
	if errMsg != nil {
		d.Error = *errMsg
	}
	return d, nil
}

func scanVideo(row pgx.Row) (video.Video, error) {
	var v video.Video
	var platform string
	err := row.Scan(&v.ID, &platform, &v.SourceID, &v.PageURL, &v.Caption, &v.CreatorHandle, &v.CreatorName,
		&v.ThumbnailURL, &v.VideoURL, &v.DurationSeconds, &v.ViewCount, &v.LikeCount, &v.CommentCount, &v.ShareCount,
		&v.Hashtags, &v.PublishedAt, &v.DiscoveredAt)
	if err != nil {
		return video.Video{}, mapDiscoveryError(err)
	}
	v.Platform = video.Platform(platform)
	if v.Hashtags == nil {
		v.Hashtags = []string{}
	}
	return v, nil
}

// mapDiscoveryError reuses the job store's rule: a missing row and a malformed
// ID are the same answer.
func mapDiscoveryError(err error) error {
	if mapped := mapError(err); mapped != err {
		return discovery.ErrNotFound
	}
	return err
}
