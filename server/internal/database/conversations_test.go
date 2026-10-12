package database

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/chat"
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
