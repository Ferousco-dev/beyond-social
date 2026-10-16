// Package insights collects per-video engagement and learns posting times
// from it. Collection runs per provider capability: YouTube exposes public
// counters, TikTok and Instagram do not, and the collector says so instead
// of recording zeros that would poison the recommendations.
package insights

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

// Metrics is one engagement snapshot.
type Metrics struct {
	PostID      string
	Views       int64
	Likes       int64
	Comments    int64
	Shares      int64
	CollectedAt time.Time
}

// Sample pairs a finished post's send time with its latest standing.
type Sample struct {
	ScheduledAt time.Time
	Views       int64
	Likes       int64
	Comments    int64
	Shares      int64
}

// Slot is one recommended posting time with its evidence.
type Slot struct {
	Weekday time.Weekday `json:"weekday"`
	Hour    int          `json:"hour"`
	Score   float64      `json:"score"`
	Posts   int          `json:"posts"`
}

// DuePost is a published post whose metrics are stale or missing.
type DuePost struct {
	ID         string
	UserID     string
	Platform   social.Platform
	ExternalID string
}

var ErrNoMetrics = errors.New("no metrics collected yet")

const (
	// collectEvery sets staleness: a post is re-read when its newest snapshot
	// is older than this.
	collectEvery = 6 * time.Hour
	// collectBatch bounds one collector pass.
	collectBatch = 20
	// minBucketPosts keeps one viral post from declaring a time slot.
	minBucketPosts = 2
	// maxSlots caps the advice to a readable few.
	maxSlots = 3
)

// Repository persists snapshots. *database.MetricsStore satisfies it.
type Repository interface {
	Insert(ctx context.Context, userID, postID string, views, likes, comments, shares int64) (Metrics, error)
	Latest(ctx context.Context, userID, postID string) (Metrics, error)
	History(ctx context.Context, userID, postID string, limit int) ([]Metrics, error)
	Samples(ctx context.Context, userID string, platform social.Platform, days int) ([]Sample, error)
	DuePublished(ctx context.Context, staleBefore time.Time, limit int) ([]DuePost, error)
}

// TokenSource signs metric reads as the user.
type TokenSource interface {
	Token(ctx context.Context, userID string, platform social.Platform) (social.Tokens, social.Connection, error)
}

// StatsFetcher reads public counters from one provider.
type StatsFetcher interface {
	VideoStats(ctx context.Context, access, videoID string) (social.Stats, error)
}

type Service struct {
	repo    Repository
	tokens  TokenSource
	youtube StatsFetcher
}

func NewService(repo Repository, tokens TokenSource, youtube StatsFetcher) *Service {
	return &Service{repo: repo, tokens: tokens, youtube: youtube}
}

func (s *Service) Latest(ctx context.Context, userID, postID string) (Metrics, error) {
	return s.repo.Latest(ctx, userID, postID)
}

func (s *Service) History(ctx context.Context, userID, postID string) ([]Metrics, error) {
	return s.repo.History(ctx, userID, postID, 30)
}

// Collect refreshes one round of stale YouTube posts. Anything else is
// skipped openly: recording zeros for unmeasurable platforms would read as
// failure and teach the recommender lies.
func (s *Service) Collect(ctx context.Context) (int, error) {
	due, err := s.repo.DuePublished(ctx, time.Now().Add(-collectEvery), collectBatch)
	if err != nil {
		return 0, err
	}
	collected := 0
	for _, post := range due {
		if post.Platform != social.YouTube {
			continue
		}
		if post.ExternalID == "" {
			continue
		}
		tokens, _, err := s.tokens.Token(ctx, post.UserID, post.Platform)
		if err != nil {
			continue
		}
		stats, err := s.youtube.VideoStats(ctx, tokens.Access, post.ExternalID)
		if err != nil {
			continue
		}
		if _, err := s.repo.Insert(ctx, post.UserID, post.ID, stats.Views, stats.Likes, stats.Comments, 0); err != nil {
			return collected, err
		}
		collected++
	}
	return collected, nil
}

// Collector runs collection rounds on an interval, like the sweeper.
type Collector struct {
	service *Service
	every   time.Duration
}

// NewCollector schedules Collect on every.
func NewCollector(service *Service, every time.Duration) *Collector {
	return &Collector{service: service, every: every}
}

// Run collects until ctx ends.
func (c *Collector) Run(ctx context.Context) {
	ticker := time.NewTicker(c.every)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if _, err := c.service.Collect(ctx); err != nil {
				slog.Error("collect metrics", "error", err)
			}
		}
	}
}

// Recommend ranks weekday-hour buckets by engagement rate from the account's
// own history. Buckets with fewer than minBucketPosts are ignored, and an
// account with no usable history gets no slots rather than generic advice.
func (s *Service) Recommend(ctx context.Context, userID string, platform social.Platform) ([]Slot, error) {
	samples, err := s.repo.Samples(ctx, userID, platform, 90)
	if err != nil {
		return nil, err
	}
	type bucket struct {
		score float64
		posts int
	}
	buckets := make(map[[2]int]*bucket)
	for _, sample := range samples {
		if sample.Views <= 0 {
			continue
		}
		key := [2]int{int(sample.ScheduledAt.Weekday()), sample.ScheduledAt.Hour()}
		entry := buckets[key]
		if entry == nil {
			entry = &bucket{}
			buckets[key] = entry
		}
		entry.score += float64(sample.Likes+sample.Comments*3) / float64(sample.Views)
		entry.posts++
	}
	slots := make([]Slot, 0, len(buckets))
	for key, entry := range buckets {
		if entry.posts < minBucketPosts {
			continue
		}
		slots = append(slots, Slot{Weekday: time.Weekday(key[0]), Hour: key[1], Score: entry.score / float64(entry.posts), Posts: entry.posts})
	}
	for i := 1; i < len(slots); i++ {
		for j := i; j > 0 && slots[j].Score > slots[j-1].Score; j-- {
			slots[j], slots[j-1] = slots[j-1], slots[j]
		}
	}
	if len(slots) > maxSlots {
		slots = slots[:maxSlots]
	}
	return slots, nil
}
