package database

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/editor"
	"github.com/google/uuid"
)

func TestEditorProjectsAreOwnedVersionedAndLimited(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewEditorStore(pool)
	alice, bob := uuid.NewString(), uuid.NewString()
	for _, id := range []string{alice, bob} {
		if _, err := NewProfileStore(pool).Ensure(ctx, id, id[:8]+"@example.com", "U"); err != nil {
			t.Fatal(err)
		}
	}
	doc := json.RawMessage(`{"tracks":[]}`)
	p, err := store.Create(ctx, alice, "Ad", doc)
	if err != nil || p.Version != 1 {
		t.Fatalf("create: %+v %v", p, err)
	}
	if _, err := store.Get(ctx, bob, p.ID); !errors.Is(err, editor.ErrNotFound) {
		t.Fatalf("a stranger read it: %v", err)
	}
	saved, err := store.Save(ctx, alice, p.ID, "Ad v2", json.RawMessage(`{"tracks":[1]}`), 1)
	if err != nil || saved.Version != 2 || saved.Title != "Ad v2" {
		t.Fatalf("save: %+v %v", saved, err)
	}
	if _, err := store.Save(ctx, alice, p.ID, "Ad", doc, 1); !errors.Is(err, editor.ErrStale) {
		t.Fatalf("a stale save was accepted: %v", err)
	}
	if _, err := store.Save(ctx, bob, p.ID, "Mine", doc, 2); !errors.Is(err, editor.ErrNotFound) {
		t.Fatalf("a stranger saved it: %v", err)
	}
	if list, _ := store.List(ctx, alice, 10); len(list) != 1 {
		t.Fatalf("list = %+v", list)
	}
	if err := store.Delete(ctx, bob, p.ID); !errors.Is(err, editor.ErrNotFound) {
		t.Fatalf("a stranger deleted it: %v", err)
	}
	if err := store.Delete(ctx, alice, p.ID); err != nil {
		t.Fatal(err)
	}
}

func TestEditorProjectPerConversation(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewEditorStore(pool)
	alice, bob := uuid.NewString(), uuid.NewString()
	for _, id := range []string{alice, bob} {
		if _, err := NewProfileStore(pool).Ensure(ctx, id, id[:8]+"@example.com", "U"); err != nil {
			t.Fatal(err)
		}
	}
	var chat string
	if err := pool.QueryRow(ctx, `insert into public.conversations (user_id, title) values ($1, 'Shoe ad') returning id::text`, alice).Scan(&chat); err != nil {
		t.Fatal(err)
	}
	first, err := store.ForConversation(ctx, alice, chat)
	if err != nil || first.Title != "Shoe ad" || first.ConversationID != chat {
		t.Fatalf("first: %+v %v", first, err)
	}
	again, err := store.ForConversation(ctx, alice, chat)
	if err != nil || again.ID != first.ID {
		t.Fatalf("a second open made another project: %+v %v", again, err)
	}
	if _, err := store.ForConversation(ctx, bob, chat); !errors.Is(err, editor.ErrNotFound) {
		t.Fatalf("someone else opened it: %v", err)
	}
}

func TestEditorProjectLimit(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewEditorStore(pool)
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, user[:8]+"@example.com", "U"); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `insert into public.editor_projects (user_id) select $1 from generate_series(1, $2)`, user, editor.MaxProjects); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Create(ctx, user, "One too many", json.RawMessage(`{}`)); !errors.Is(err, editor.ErrLimit) {
		t.Fatalf("limit not enforced: %v", err)
	}
}
