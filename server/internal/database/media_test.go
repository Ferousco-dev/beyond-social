package database

import (
	"context"
	"errors"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/chat"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/google/uuid"
)

func TestMediaIsOwnedAndAttachmentsSurviveInMessages(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	alice, bob := uuid.NewString(), uuid.NewString()
	for _, id := range []string{alice, bob} {
		if _, err := NewProfileStore(pool).Ensure(ctx, id, id[:8]+"@example.com", "U"); err != nil {
			t.Fatal(err)
		}
	}
	store := NewMediaStore(pool)
	id := uuid.NewString()
	item, err := store.Create(ctx, media.Item{ID: id, UserID: alice, Kind: media.KindImage, Name: "a.png", MIME: "image/png", Size: 10, Path: alice + "/" + id + ".png"})
	if err != nil || item.Ready {
		t.Fatalf("create: %+v %v", item, err)
	}
	if _, err := store.Get(ctx, bob, id); !errors.Is(err, media.ErrNotFound) {
		t.Fatalf("a stranger read it: %v", err)
	}
	if _, err := store.Get(ctx, alice, "not-a-uuid"); !errors.Is(err, media.ErrNotFound) {
		t.Fatalf("a malformed id: %v", err)
	}
	if err := store.MarkReady(ctx, id, 99); err != nil {
		t.Fatal(err)
	}
	if got, _ := store.Get(ctx, alice, id); !got.Ready || got.Size != 99 {
		t.Fatalf("after ready: %+v", got)
	}

	conversations := NewConversationStore(pool)
	conv, _ := conversations.Create(ctx, alice)
	sent, _, err := conversations.AddUser(ctx, chat.Message{ConversationID: conv.ID, UserID: alice, Content: "look", Attachments: []media.Descriptor{item.Descriptor()}}, "k")
	if err != nil || len(sent.Attachments) != 1 || sent.Attachments[0].Name != "a.png" {
		t.Fatalf("saved = %+v err=%v", sent, err)
	}
	plain, _, _ := conversations.AddUser(ctx, chat.Message{ConversationID: conv.ID, UserID: alice, Content: "no files"}, "k2")
	if len(plain.Attachments) != 0 {
		t.Fatalf("a message without files carries %+v", plain.Attachments)
	}
	msgs, _ := conversations.Messages(ctx, alice, conv.ID, 10)
	if len(msgs) != 2 || len(msgs[0].Attachments) != 1 {
		t.Fatalf("reloaded = %+v", msgs)
	}
}
