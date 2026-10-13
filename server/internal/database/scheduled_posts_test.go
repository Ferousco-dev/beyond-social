package database

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/publish"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
	"github.com/google/uuid"
)

func TestPostsAreOwnedIdempotentCancellableAndLeased(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewPostStore(pool)
	alice, bob := uuid.NewString(), uuid.NewString()
	for _, id := range []string{alice, bob} {
		if _, err := NewProfileStore(pool).Ensure(ctx, id, id[:8]+"@example.com", "U"); err != nil {
			t.Fatal(err)
		}
	}
	draft := publish.Post{UserID: alice, Platform: social.YouTube, Caption: "hi", Visibility: "public", SourceURL: "https://cdn.example/v.mp4", ScheduledAt: time.Now().Add(time.Hour)}

	post, isNew, err := store.Create(ctx, draft, "k1")
	if err != nil || !isNew || post.Status != publish.StatusPreparing {
		t.Fatalf("create: %+v new=%v err=%v", post, isNew, err)
	}
	if again, isNew, err := store.Create(ctx, draft, "k1"); err != nil || isNew || again.ID != post.ID {
		t.Fatalf("a repeat made another post: %+v new=%v err=%v", again, isNew, err)
	}
	if _, err := store.Get(ctx, bob, post.ID); !errors.Is(err, publish.ErrNotFound) {
		t.Fatalf("a stranger read it: %v", err)
	}
	if n, _ := store.CountOpen(ctx, alice); n != 1 {
		t.Fatalf("open = %d", n)
	}
	if _, err := store.Cancel(ctx, bob, post.ID); !errors.Is(err, publish.ErrNotFound) {
		t.Fatalf("a stranger cancelled it: %v", err)
	}

	// A due post is leased: claiming it again straight away finds nothing.
	claimed, err := store.Claim(ctx, 5, time.Minute)
	if err != nil || len(claimed) != 1 || claimed[0].ID != post.ID {
		t.Fatalf("claim = %+v err=%v", claimed, err)
	}
	if again, _ := store.Claim(ctx, 5, time.Minute); len(again) != 0 {
		t.Fatalf("a leased post was claimed twice: %+v", again)
	}

	path := alice + "/posts/x.mp4"
	later := time.Now().Add(time.Hour)
	moved, err := store.Advance(ctx, post.ID, publish.Update{Status: publish.StatusScheduled, StoragePath: &path, NextRun: &later})
	if err != nil || moved.Status != publish.StatusScheduled || moved.StoragePath != path || moved.NextRunAt == nil {
		t.Fatalf("advance = %+v err=%v", moved, err)
	}
	started, err := store.Advance(ctx, post.ID, publish.Update{Status: publish.StatusPublishing, MarkStarted: true})
	if err != nil || started.PublishStartedAt == nil {
		t.Fatalf("started = %+v err=%v", started, err)
	}
	first := *started.PublishStartedAt
	if again, _ := store.Advance(ctx, post.ID, publish.Update{MarkStarted: true, AttemptsDelta: 1}); !again.PublishStartedAt.Equal(first) || again.Attempts != 1 {
		t.Fatalf("the start marker moved: %+v", again)
	}
	if _, err := store.Cancel(ctx, alice, post.ID); !errors.Is(err, publish.ErrNotCancellable) {
		t.Fatalf("a post already sent was cancelled: %v", err)
	}

	done, err := store.Advance(ctx, post.ID, publish.Update{Status: publish.StatusPublished, ExternalID: "yt1", ExternalURL: "https://youtu.be/yt1"})
	if err != nil || done.Status != publish.StatusPublished || done.ExternalID != "yt1" || done.NextRunAt != nil {
		t.Fatalf("done = %+v err=%v", done, err)
	}
	if _, err := store.Advance(ctx, post.ID, publish.Update{Status: publish.StatusFailed, Error: "late"}); !errors.Is(err, publish.ErrNotFound) {
		t.Fatalf("a finished post was changed: %v", err)
	}
	if n, _ := store.CountOpen(ctx, alice); n != 0 {
		t.Fatalf("open after publishing = %d", n)
	}
}

func TestACancelledPostIsNeverClaimedOrChanged(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewPostStore(pool)
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, "c@example.com", "C"); err != nil {
		t.Fatal(err)
	}
	post, _, _ := store.Create(ctx, publish.Post{UserID: user, Platform: social.YouTube, Visibility: "public", SourceURL: "https://cdn.example/v.mp4", ScheduledAt: time.Now()}, "")
	cancelled, err := store.Cancel(ctx, user, post.ID)
	if err != nil || cancelled.Status != publish.StatusCancelled {
		t.Fatalf("cancel = %+v err=%v", cancelled, err)
	}
	if claimed, _ := store.Claim(ctx, 5, time.Minute); len(claimed) != 0 {
		t.Fatalf("a cancelled post was claimed: %+v", claimed)
	}
	if _, err := store.Advance(ctx, post.ID, publish.Update{Status: publish.StatusPublished}); !errors.Is(err, publish.ErrNotFound) {
		t.Fatalf("a cancelled post was advanced: %v", err)
	}
	if _, err := store.Cancel(ctx, user, post.ID); !errors.Is(err, publish.ErrNotCancellable) {
		t.Fatalf("cancelling twice: %v", err)
	}
}
