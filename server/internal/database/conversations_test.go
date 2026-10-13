package database

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/analysis"
	"github.com/Ferousco-dev/beyond-social/server/internal/chat"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/google/uuid"
)

func TestConversationsAreOwnedOrdersAndDeduplicate(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewConversationStore(pool)
	alice, bob := uuid.NewString(), uuid.NewString()
	for _, id := range []string{alice, bob} {
		if _, err := NewProfileStore(pool).Ensure(ctx, id, id[:8]+"@example.com", "U"); err != nil {
			t.Fatal(err)
		}
	}
	conv, err := store.Create(ctx, alice)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.Get(ctx, bob, conv.ID); !errors.Is(err, chat.ErrNotFound) {
		t.Fatalf("a stranger must not see it: %v", err)
	}
	if _, err := store.Get(ctx, alice, "not-a-uuid"); !errors.Is(err, chat.ErrNotFound) {
		t.Fatalf("a malformed id is simply not found: %v", err)
	}

	first, isNew, err := store.AddUser(ctx, chat.Message{ConversationID: conv.ID, UserID: alice, Content: "one"}, "k1")
	if err != nil || !isNew {
		t.Fatalf("first: %v new=%v", err, isNew)
	}
	again, isNew, err := store.AddUser(ctx, chat.Message{ConversationID: conv.ID, UserID: alice, Content: "one"}, "k1")
	if err != nil || isNew || again.ID != first.ID {
		t.Fatalf("repeat: %+v new=%v err=%v", again, isNew, err)
	}
	if _, ok, _ := store.ReplyTo(ctx, first.ID); ok {
		t.Fatal("no reply yet")
	}
	reply, err := store.AddAssistant(ctx, chat.Message{ConversationID: conv.ID, UserID: alice, Content: "answer", ReplyTo: first.ID})
	if err != nil {
		t.Fatal(err)
	}
	if got, ok, err := store.ReplyTo(ctx, first.ID); err != nil || !ok || got.ID != reply.ID {
		t.Fatalf("reply lookup = %+v ok=%v err=%v", got, ok, err)
	}

	msgs, err := store.Messages(ctx, alice, conv.ID, 10)
	if err != nil || len(msgs) != 2 || msgs[0].Role != chat.RoleUser || msgs[1].Role != chat.RoleAssistant {
		t.Fatalf("messages = %+v err=%v", msgs, err)
	}
	if other, _ := store.Messages(ctx, bob, conv.ID, 10); len(other) != 0 {
		t.Fatal("a stranger read messages")
	}
	if n, _ := store.CountUserMessagesSince(ctx, alice, time.Now().Add(-time.Hour)); n != 1 {
		t.Fatalf("user messages today = %d, want 1", n)
	}

	if list, _ := store.List(ctx, alice, 10, 0); len(list) != 0 {
		t.Fatalf("an untitled thread must not be listed: %+v", list)
	}
	if err := store.SetTitle(ctx, conv.ID, "one"); err != nil {
		t.Fatal(err)
	}
	if list, _ := store.List(ctx, alice, 10, 0); len(list) != 1 {
		t.Fatalf("a titled thread must be listed: %+v", list)
	}
	if err := store.Archive(ctx, bob, conv.ID); !errors.Is(err, chat.ErrNotFound) {
		t.Fatalf("a stranger archived it: %v", err)
	}
	if err := store.Archive(ctx, alice, conv.ID); err != nil {
		t.Fatal(err)
	}
	if list, _ := store.List(ctx, alice, 10, 0); len(list) != 0 {
		t.Fatalf("archived thread still listed: %+v", list)
	}
}

func TestAnalysisJobPostsItsResultOnceThroughTheRealStores(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, "a@example.com", "A"); err != nil {
		t.Fatal(err)
	}
	conversations := NewConversationStore(pool)
	conv, err := conversations.Create(ctx, user)
	if err != nil {
		t.Fatal(err)
	}
	if err := conversations.SetTitle(ctx, conv.ID, "t"); err != nil {
		t.Fatal(err)
	}

	chatSvc := chat.NewService(conversations, nil, nil)
	jobSvc := jobs.NewService(NewJobStore(pool), nil).WithObserver(chatSvc)
	job, _, err := jobSvc.Create(ctx, user, analysis.JobType, map[string]any{"url": "https://youtu.be/dQw4w9WgXcQ", "conversation_id": conv.ID}, "")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := jobSvc.Advance(ctx, job.ID, jobs.Update{Status: jobs.StatusRunning}); err != nil {
		t.Fatal(err)
	}
	result := map[string]any{"analysis": map[string]any{"summary": "A runner at dawn.", "scenes": []any{}, "duration_seconds": 9.0}}
	if _, err := jobSvc.Advance(ctx, job.ID, jobs.Update{Status: jobs.StatusCompleted, Result: result}); err != nil {
		t.Fatal(err)
	}
	// A second report of the same ending adds nothing.
	chatSvc.JobFinished(ctx, job)

	msgs, err := conversations.Messages(ctx, user, conv.ID, 10)
	if err != nil || len(msgs) != 1 || msgs[0].JobID != job.ID || msgs[0].Role != chat.RoleAssistant {
		t.Fatalf("messages = %+v err=%v", msgs, err)
	}
}

func TestMissingFollowUpsFindsFinishedAnalysesWithNoMessage(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, "m@example.com", "M"); err != nil {
		t.Fatal(err)
	}
	conversations := NewConversationStore(pool)
	conv, _ := conversations.Create(ctx, user)
	if err := conversations.SetTitle(ctx, conv.ID, "t"); err != nil {
		t.Fatal(err)
	}
	store := NewJobStore(pool)
	j, _ := jobs.NewJob(user, analysis.JobType, map[string]any{"url": "https://youtu.be/dQw4w9WgXcQ", "conversation_id": conv.ID})
	created, _, err := store.Create(ctx, j)
	if err != nil {
		t.Fatal(err)
	}
	for _, status := range []jobs.Status{jobs.StatusRunning, jobs.StatusFailed} {
		if _, err := store.Advance(ctx, created.ID, jobs.Update{Status: status, Error: "x"}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := pool.Exec(ctx, `update public.jobs set updated_at = now() - interval '1 hour' where id = $1`, created.ID); err != nil {
		t.Fatal(err)
	}
	missing, err := conversations.MissingFollowUps(ctx, time.Minute, 10)
	if err != nil || len(missing) != 1 || missing[0].ID != created.ID {
		t.Fatalf("missing = %+v err=%v", missing, err)
	}
	chat.NewService(conversations, nil, nil).Reconcile(ctx)
	if again, _ := conversations.MissingFollowUps(ctx, time.Minute, 10); len(again) != 0 {
		t.Fatalf("still missing after reconcile: %+v", again)
	}
}

func TestAScriptSurvivesAsStructuredData(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, "s@example.com", "S"); err != nil {
		t.Fatal(err)
	}
	store := NewConversationStore(pool)
	conv, _ := store.Create(ctx, user)
	script := &chat.Script{Title: "Dawn run", Scenes: []chat.Scene{{Seconds: 5, Visual: "A runner", Voiceover: "Go"}}}
	saved, err := store.AddAssistant(ctx, chat.Message{ConversationID: conv.ID, UserID: user, Role: chat.RoleAssistant, Content: "script", Script: script})
	if err != nil || saved.Script == nil || saved.Script.Scenes[0].Voiceover != "Go" {
		t.Fatalf("saved = %+v err=%v", saved, err)
	}
	plain, _ := store.AddAssistant(ctx, chat.Message{ConversationID: conv.ID, UserID: user, Role: chat.RoleAssistant, Content: "hello"})
	if plain.Script != nil {
		t.Fatalf("a plain message carries %+v", plain.Script)
	}
}
