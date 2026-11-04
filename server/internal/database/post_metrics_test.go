package database

import (
	"context"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/publish"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
	"github.com/google/uuid"
)

func TestMetricsRoundTripAndDue(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	posts := NewPostStore(pool)
	metrics := NewMetricsStore(pool)
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, "m@example.com", "M"); err != nil {
		t.Fatal(err)
	}
	post, _, err := posts.Create(ctx, publish.Post{UserID: user, Platform: social.YouTube, Visibility: "public", SourceURL: "https://cdn.example/v.mp4", ScheduledAt: time.Now().Add(time.Hour)}, "")
	if err != nil {
		t.Fatalf("create post: %v", err)
	}
	if _, err := posts.Advance(ctx, post.ID, publish.Update{Status: publish.StatusPublished, ExternalID: "vid-1"}); err != nil {
		t.Fatalf("publish: %v", err)
	}

	due, err := metrics.DuePublished(ctx, time.Now(), 10)
	if err != nil || len(due) != 1 || due[0].ExternalID != "vid-1" {
		t.Fatalf("published post must be due: %+v %v", due, err)
	}
	if _, err := metrics.Latest(ctx, user, post.ID); err == nil {
		t.Fatal("no snapshots yet")
	}

	recorded, err := metrics.Insert(ctx, user, post.ID, 100, 10, 2, 0)
	if err != nil || recorded.Views != 100 {
		t.Fatalf("insert: %+v %v", recorded, err)
	}
	latest, err := metrics.Latest(ctx, user, post.ID)
	if err != nil || latest.Likes != 10 {
		t.Fatalf("latest: %+v %v", latest, err)
	}
	history, err := metrics.History(ctx, user, post.ID, 30)
	if err != nil || len(history) != 1 {
		t.Fatalf("history: %d %v", len(history), err)
	}
	due, err = metrics.DuePublished(ctx, time.Now().Add(-time.Minute), 10)
	if err != nil || len(due) != 0 {
		t.Fatalf("fresh post must not be due: %d %v", len(due), err)
	}
}
