package database

import (
	"context"
	"errors"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/library"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
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

func TestAdoptedVideoIsFoundByItsJobAndStoredOncePerUser(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	alice := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, alice, alice[:8]+"@example.com", "U"); err != nil {
		t.Fatal(err)
	}
	var job string
	if err := pool.QueryRow(ctx, `insert into public.jobs (user_id, job_type, status, input, result, completed_at)
		values ($1, 'video_generate', 'completed', '{"prompt":"a dog"}', '{"video_url":"https://cdn.example/a.mp4"}', now()) returning id::text`, alice).Scan(&job); err != nil {
		t.Fatal(err)
	}
	lib := NewLibraryStore(pool)
	video, err := lib.Video(ctx, alice, job)
	if err != nil || video.VideoURL != "https://cdn.example/a.mp4" || video.Prompt != "a dog" {
		t.Fatalf("video: %+v %v", video, err)
	}
	if _, err := lib.Video(ctx, uuid.NewString(), job); !errors.Is(err, library.ErrNotFound) {
		t.Fatalf("a stranger read it: %v", err)
	}

	store := NewMediaStore(pool)
	if _, found, err := store.FindByJob(ctx, alice, job); err != nil || found {
		t.Fatalf("found before adopting: %v %v", found, err)
	}
	id := uuid.NewString()
	item, err := store.Create(ctx, media.Item{ID: id, UserID: alice, Kind: media.KindVideo, Name: "a dog", MIME: "video/mp4", Size: 10, Path: alice + "/" + id + ".mp4", SourceJobID: job})
	if err != nil || item.SourceJobID != job {
		t.Fatalf("create: %+v %v", item, err)
	}
	if _, found, _ := store.FindByJob(ctx, alice, job); found {
		t.Fatal("an unfinished copy was returned")
	}
	if err := store.MarkReady(ctx, id, 10); err != nil {
		t.Fatal(err)
	}
	if got, found, err := store.FindByJob(ctx, alice, job); err != nil || !found || got.ID != id {
		t.Fatalf("find: %+v %v %v", got, found, err)
	}
	dup := uuid.NewString()
	if _, err := store.Create(ctx, media.Item{ID: dup, UserID: alice, Kind: media.KindVideo, Name: "x", MIME: "video/mp4", Size: 10, Path: alice + "/" + dup + ".mp4", SourceJobID: job}); err == nil {
		t.Fatal("a second copy of the same job was stored")
	}
}

func TestLibraryCanBeNarrowedToTheVideosOfOneChat(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	alice, bob := uuid.NewString(), uuid.NewString()
	for _, id := range []string{alice, bob} {
		if _, err := NewProfileStore(pool).Ensure(ctx, id, id[:8]+"@example.com", "U"); err != nil {
			t.Fatal(err)
		}
	}
	chats := NewConversationStore(pool)
	chatA, _ := chats.Create(ctx, alice)
	chatB, _ := chats.Create(ctx, alice)

	// madeBy records a finished video and the plan step that started it, shown in a chat.
	madeBy := func(owner, chat string) string {
		var job, workflow string
		if err := pool.QueryRow(ctx, `insert into public.jobs (user_id, job_type, status, input, result, completed_at)
			values ($1, 'video_generate', 'completed', '{"prompt":"p"}', '{"video_url":"https://cdn.example/v.mp4"}', now()) returning id::text`, owner).Scan(&job); err != nil {
			t.Fatal(err)
		}
		if err := pool.QueryRow(ctx, `insert into public.workflows (user_id, objective) values ($1, 'make') returning id::text`, owner).Scan(&workflow); err != nil {
			t.Fatal(err)
		}
		if _, err := pool.Exec(ctx, `insert into public.workflow_steps (workflow_id, user_id, step_id, tool, output) values ($1, $2, 's1', 'generate_video', jsonb_build_object('ref', $3::text))`, workflow, owner, job); err != nil {
			t.Fatal(err)
		}
		if _, err := pool.Exec(ctx, `insert into public.messages (conversation_id, user_id, role, content, workflow_id) values ($1, $2, 'assistant', 'plan', $3)`, chat, owner, workflow); err != nil {
			t.Fatal(err)
		}
		return job
	}
	inA := madeBy(alice, chatA.ID)
	madeBy(alice, chatB.ID)
	// A video made outside any chat is in the library but in no chat's list.
	var loose string
	if err := pool.QueryRow(ctx, `insert into public.jobs (user_id, job_type, status, input, result, completed_at)
		values ($1, 'video_generate', 'completed', '{}', '{"video_url":"https://cdn.example/l.mp4"}', now()) returning id::text`, alice).Scan(&loose); err != nil {
		t.Fatal(err)
	}

	store := NewLibraryStore(pool)
	items, err := store.ListForConversation(ctx, alice, chatA.ID, 10)
	if err != nil || len(items) != 1 || items[0].ID != inA {
		t.Fatalf("chat A = %+v err=%v", items, err)
	}
	if all, _ := store.List(ctx, alice, 10, 0); len(all) != 3 {
		t.Fatalf("the whole library lost videos: %d", len(all))
	}
	if other, _ := store.ListForConversation(ctx, bob, chatA.ID, 10); len(other) != 0 {
		t.Fatalf("someone else's chat listed %d videos", len(other))
	}
	if items, err := store.ListForConversation(ctx, alice, "not-a-uuid", 10); err != nil || len(items) != 0 {
		t.Fatalf("a bad id: %+v %v", items, err)
	}
}
