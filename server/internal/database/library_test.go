package database

import (
	"context"
	"errors"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/library"
	"github.com/google/uuid"
)

func TestLibraryListsOwnFinishedVideosAndHidesThem(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	alice, bob := uuid.NewString(), uuid.NewString()
	for _, id := range []string{alice, bob} {
		if _, err := NewProfileStore(pool).Ensure(ctx, id, id[:8]+"@example.com", "U"); err != nil {
			t.Fatal(err)
		}
	}
	insert := func(user, kind, status, result string) string {
		var id string
		err := pool.QueryRow(ctx, `insert into public.jobs (user_id, job_type, status, input, result, completed_at)
			values ($1, $2, $3, '{"prompt":"a dog"}', $4::jsonb, now()) returning id::text`, user, kind, status, result).Scan(&id)
		if err != nil {
			t.Fatal(err)
		}
		return id
	}
	done := insert(alice, "video_generate", "completed", `{"video_url":"https://cdn.example/a.mp4"}`)
	insert(alice, "video_generate", "running", `{}`)
	insert(alice, "video_analysis", "completed", `{"video_url":"https://cdn.example/x.mp4"}`)
	insert(bob, "video_generate", "completed", `{"video_url":"https://cdn.example/b.mp4"}`)

	store := NewLibraryStore(pool)
	items, err := store.List(ctx, alice, 10, 0)
	if err != nil || len(items) != 1 || items[0].ID != done || items[0].Prompt != "a dog" {
		t.Fatalf("list = %+v err=%v", items, err)
	}
	if err := store.Hide(ctx, bob, done); !errors.Is(err, library.ErrNotFound) {
		t.Fatalf("a stranger hid it: %v", err)
	}
	if err := store.Hide(ctx, alice, done); err != nil {
		t.Fatal(err)
	}
	if items, _ := store.List(ctx, alice, 10, 0); len(items) != 0 {
		t.Fatalf("hidden video still listed: %+v", items)
	}
}
