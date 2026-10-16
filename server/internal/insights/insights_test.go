package insights

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

type fakeRepo struct {
	due      []DuePost
	samples  []Sample
	latest   map[string]Metrics
	inserted int
}

func (f *fakeRepo) Insert(_ context.Context, userID, postID string, views, likes, comments, shares int64) (Metrics, error) {
	f.inserted++
	return Metrics{PostID: postID, Views: views, Likes: likes, Comments: comments, Shares: shares}, nil
}

func (f *fakeRepo) Latest(_ context.Context, _, postID string) (Metrics, error) {
	metrics, ok := f.latest[postID]
	if !ok {
		return Metrics{}, ErrNoMetrics
	}
	return metrics, nil
}

func (f *fakeRepo) History(_ context.Context, _, _ string, _ int) ([]Metrics, error) {
	return nil, nil
}

func (f *fakeRepo) Samples(_ context.Context, _ string, _ social.Platform, _ int) ([]Sample, error) {
	return f.samples, nil
}

func (f *fakeRepo) DuePublished(_ context.Context, _ time.Time, _ int) ([]DuePost, error) {
	return f.due, nil
}

type fakeTokens struct {
	err error
}

func (f fakeTokens) Token(_ context.Context, _ string, _ social.Platform) (social.Tokens, social.Connection, error) {
	if f.err != nil {
		return social.Tokens{}, social.Connection{}, f.err
	}
	return social.Tokens{Access: "token-1"}, social.Connection{}, nil
}

type fakeStats struct {
	stats social.Stats
	err   error
}

func (f fakeStats) VideoStats(_ context.Context, _, _ string) (social.Stats, error) {
	return f.stats, f.err
}

func TestCollectSkipsUnsupportedPlatforms(t *testing.T) {
	repo := &fakeRepo{due: []DuePost{
		{ID: "p1", UserID: "u1", Platform: social.YouTube, ExternalID: "vid-1"},
		{ID: "p2", UserID: "u1", Platform: social.TikTok, ExternalID: "vid-2"},
		{ID: "p3", UserID: "u1", Platform: social.Instagram, ExternalID: ""},
	}}
	service := NewService(repo, fakeTokens{}, fakeStats{stats: social.Stats{Views: 100, Likes: 10, Comments: 2}})
	collected, err := service.Collect(context.Background())
	if err != nil {
		t.Fatalf("collect: %v", err)
	}
	if collected != 1 || repo.inserted != 1 {
		t.Fatalf("only the YouTube post collects: %d", collected)
	}
}

func TestCollectSkipsDisconnectedAccounts(t *testing.T) {
	repo := &fakeRepo{due: []DuePost{{ID: "p1", UserID: "u1", Platform: social.YouTube, ExternalID: "vid-1"}}}
	service := NewService(repo, fakeTokens{err: errors.New("reconnect")}, fakeStats{})
	collected, err := service.Collect(context.Background())
	if err != nil || collected != 0 || repo.inserted != 0 {
		t.Fatalf("disconnected accounts wait: %d %v", collected, err)
	}
}

func mondayAt(hour int) time.Time {
	return time.Date(2026, 10, 12, hour, 0, 0, 0, time.UTC)
}

func TestRecommendRanksEngagement(t *testing.T) {
	repo := &fakeRepo{samples: []Sample{
		{ScheduledAt: mondayAt(18), Views: 1000, Likes: 100},
		{ScheduledAt: mondayAt(18).AddDate(0, 0, 7), Views: 1000, Likes: 120},
		{ScheduledAt: mondayAt(9), Views: 1000, Likes: 10},
		{ScheduledAt: mondayAt(9).AddDate(0, 0, 7), Views: 1000, Likes: 5},
		{ScheduledAt: mondayAt(12), Views: 1000, Likes: 500},
	}}
	service := NewService(repo, fakeTokens{}, fakeStats{})
	slots, err := service.Recommend(context.Background(), "u1", social.YouTube)
	if err != nil {
		t.Fatalf("recommend: %v", err)
	}
	// The lone noon post cannot form a bucket; 18:00 beats 09:00.
	if len(slots) != 2 || slots[0].Hour != 18 || slots[1].Hour != 9 {
		t.Fatalf("slots = %+v", slots)
	}
	if slots[0].Posts != 2 || slots[0].Weekday != time.Monday {
		t.Fatalf("slot = %+v", slots[0])
	}
}

func TestRecommendNeedsHistory(t *testing.T) {
	service := NewService(&fakeRepo{}, fakeTokens{}, fakeStats{})
	slots, err := service.Recommend(context.Background(), "u1", social.YouTube)
	if err != nil {
		t.Fatalf("recommend: %v", err)
	}
	if len(slots) != 0 {
		t.Fatalf("thin history must yield no slots: %+v", slots)
	}
}
