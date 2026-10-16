package database

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestMonitoringSnapshotIncludesWorkloadsFailuresAndMedia(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	userID := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, userID, userID[:8]+"@example.com", "User"); err != nil {
		t.Fatal(err)
	}
	_, err := pool.Exec(ctx, `
		insert into public.jobs (user_id, job_type, status, created_at, started_at, updated_at, error) values
		($1, 'generate_video', 'queued', now() - interval '1 hour', null, now(), null),
		($1, 'generate_video', 'running', now() - interval '1 hour', now() - interval '10 minutes', now(), null),
		($1, 'analyze_video', 'failed', now() - interval '2 hours', now() - interval '2 hours', now(), 'provider failed')`, userID)
	if err != nil {
		t.Fatal(err)
	}
	_, err = pool.Exec(ctx, `
		insert into public.scheduled_posts (user_id, platform, source_url, scheduled_at, status, error) values
		($1, 'youtube', 'https://example.com/video', now() + interval '1 day', 'scheduled', null),
		($1, 'tiktok', 'https://example.com/video', now(), 'failed', 'publish rejected')`, userID)
	if err != nil {
		t.Fatal(err)
	}
	_, err = pool.Exec(ctx, `
		insert into public.media (user_id, kind, name, mime_type, size_bytes, path, ready_at)
		values ($1, 'image', 'cover.png', 'image/png', 3072, $2, now())`, userID, userID+"/cover.png")
	if err != nil {
		t.Fatal(err)
	}

	snapshot, err := NewMonitoringStore(pool).Snapshot(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if snapshot.Jobs.Queued != 1 || snapshot.Jobs.Running != 1 || snapshot.Jobs.Failed != 1 || snapshot.Jobs.OldestQueuedAt == nil {
		t.Fatalf("jobs = %+v", snapshot.Jobs)
	}
	if snapshot.Posts.Scheduled != 1 || snapshot.Posts.Failed != 1 {
		t.Fatalf("posts = %+v", snapshot.Posts)
	}
	if snapshot.Storage.MediaObjects != 1 || snapshot.Storage.MediaBytes != 3072 {
		t.Fatalf("storage = %+v", snapshot.Storage)
	}
	if len(snapshot.RecentFailures) != 2 {
		t.Fatalf("recent failures = %+v", snapshot.RecentFailures)
	}
}
