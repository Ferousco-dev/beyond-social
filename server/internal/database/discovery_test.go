package database

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
	"github.com/google/uuid"
)

func newDiscovery(t *testing.T, s *DiscoveryStore, user string) discovery.Discovery {
	t.Helper()
	d, err := s.Create(context.Background(), discovery.Discovery{
		UserID: user, Platform: video.TikTok, Kind: discovery.KindSearch, Query: "cats", RequestedLimit: 10,
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	return d
}

func sampleVideos(n int) []video.Video {
	dur, views := 12.5, int64(900)
	var vs []video.Video
	for i := range n {
		vs = append(vs, video.Video{
			Platform: video.TikTok, SourceID: string(rune('a' + i)), PageURL: "https://www.tiktok.com/@a/video/1",
			Caption: "hello", CreatorHandle: "alice", DurationSeconds: &dur, ViewCount: &views,
			Hashtags: []string{"fyp"}, DiscoveredAt: time.Now().UTC(),
		})
	}
	return vs
}

func TestDiscoveryCreateGetAndOwnership(t *testing.T) {
	s := NewDiscoveryStore(testPool(t))
	ctx := context.Background()
	alice, mallory := uuid.NewString(), uuid.NewString()
	d := newDiscovery(t, s, alice)

	if d.Status != discovery.StatusQueued || d.UserID != alice || d.ApifyRunID != "" {
		t.Fatalf("unexpected %+v", d)
	}
	if got, err := s.Get(ctx, alice, d.ID); err != nil || got.ID != d.ID {
		t.Fatalf("own get: %v", err)
	}
	for name, id := range map[string]string{"foreign": d.ID, "missing": uuid.NewString(), "malformed": "nope"} {
		if _, err := s.Get(ctx, mallory, id); !errors.Is(err, discovery.ErrNotFound) {
			t.Errorf("%s: expected ErrNotFound, got %v", name, err)
		}
	}
	if n, _ := s.CountActive(ctx, alice); n != 1 {
		t.Fatalf("active count: %d", n)
	}
	if n, _ := s.CountActive(ctx, mallory); n != 0 {
		t.Fatalf("active count leaked: %d", n)
	}
}

func TestDiscoveryCompleteStoresVideosAtomically(t *testing.T) {
	s := NewDiscoveryStore(testPool(t))
	ctx := context.Background()
	alice, mallory := uuid.NewString(), uuid.NewString()
	d := newDiscovery(t, s, alice)

	done, err := s.Complete(ctx, d.ID, sampleVideos(3))
	if err != nil || done.Status != discovery.StatusCompleted || done.ResultCount != 3 || done.CompletedAt == nil {
		t.Fatalf("complete: %+v %v", done, err)
	}

	vs, err := s.ListVideos(ctx, alice, d.ID, 10, 0)
	if err != nil || len(vs) != 3 || vs[0].SourceID != "a" || vs[2].SourceID != "c" || vs[0].ID == "" {
		t.Fatalf("videos: %+v %v", vs, err)
	}
	if vs[0].DurationSeconds == nil || *vs[0].DurationSeconds != 12.5 || vs[0].ViewCount == nil || vs[0].LikeCount != nil || vs[0].ThumbnailURL != "" || len(vs[0].Hashtags) != 1 {
		t.Fatalf("optional fields should round trip as reported: %+v", vs[0])
	}
	page, _ := s.ListVideos(ctx, alice, d.ID, 2, 2)
	if len(page) != 1 || page[0].SourceID != "c" {
		t.Fatalf("pagination: %+v", page)
	}
	if foreign, _ := s.ListVideos(ctx, mallory, d.ID, 10, 0); len(foreign) != 0 {
		t.Fatalf("another user listed videos: %+v", foreign)
	}
	if v, err := s.GetVideo(ctx, alice, vs[1].ID); err != nil || v.SourceID != "b" {
		t.Fatalf("own video: %+v %v", v, err)
	}
	if _, err := s.GetVideo(ctx, mallory, vs[1].ID); !errors.Is(err, discovery.ErrNotFound) {
		t.Fatalf("foreign video: %v", err)
	}
	if _, err := s.GetVideo(ctx, alice, "nope"); !errors.Is(err, discovery.ErrNotFound) {
		t.Fatalf("malformed video id: %v", err)
	}

	if _, err := s.Complete(ctx, d.ID, sampleVideos(1)); !errors.Is(err, discovery.ErrFinished) {
		t.Fatalf("completing twice must be rejected, got %v", err)
	}
	if again, _ := s.ListVideos(ctx, alice, d.ID, 10, 0); len(again) != 3 {
		t.Fatal("a rejected second completion must not change the results")
	}
}

func TestDiscoveryAdvanceAndClaim(t *testing.T) {
	s := NewDiscoveryStore(testPool(t))
	ctx := context.Background()
	d := newDiscovery(t, s, uuid.NewString())

	claimed, err := s.Claim(ctx, 5, time.Minute)
	if err != nil || len(claimed) != 1 || claimed[0].ID != d.ID {
		t.Fatalf("claim: %+v %v", claimed, err)
	}
	if again, _ := s.Claim(ctx, 5, time.Minute); len(again) != 0 {
		t.Fatal("a leased discovery must not be claimed twice")
	}

	run := "run-1"
	next := time.Now().Add(-time.Second)
	running, err := s.Advance(ctx, d.ID, discovery.Update{Status: discovery.StatusRunning, RunID: &run, NextRun: &next})
	if err != nil || running.Status != discovery.StatusRunning || running.ApifyRunID != "run-1" {
		t.Fatalf("advance: %+v %v", running, err)
	}
	if again, _ := s.Claim(ctx, 5, time.Minute); len(again) != 1 || again[0].ApifyRunID != "run-1" {
		t.Fatalf("a restarted worker must see the saved run id: %+v", again)
	}

	failed, err := s.Advance(ctx, d.ID, discovery.Update{Status: discovery.StatusFailed, Error: "nope", RetryDelta: 1})
	if err != nil || failed.Status != discovery.StatusFailed || failed.Error != "nope" || failed.RetryCount != 1 || failed.CompletedAt == nil {
		t.Fatalf("fail: %+v %v", failed, err)
	}
	if _, err := s.Advance(ctx, d.ID, discovery.Update{Status: discovery.StatusRunning}); !errors.Is(err, discovery.ErrFinished) {
		t.Fatalf("finished discoveries must not move: %v", err)
	}
	if again, _ := s.Claim(ctx, 5, time.Minute); len(again) != 0 {
		t.Fatal("a finished discovery must leave the schedule")
	}
}
