package database

import (
	"context"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/google/uuid"
)

func TestListedEmailsBecomeAdminOnSignIn(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	owner, other := uuid.NewString(), uuid.NewString()
	ownerEmail := owner[:8] + "@example.com"
	store := NewProfileStore(pool).WithAdminEmails([]string{" " + ownerEmail + " "})

	if p, err := store.Ensure(ctx, owner, ownerEmail, "Owner"); err != nil || p.Role != accounts.RoleAdmin {
		t.Fatalf("listed address: role %q err %v", p.Role, err)
	}
	if p, err := store.Ensure(ctx, other, other[:8]+"@example.com", "Other"); err != nil || p.Role != accounts.RoleUser {
		t.Fatalf("unlisted address: role %q err %v", p.Role, err)
	}
	// The promotion is stored, not just reported.
	if p, err := NewProfileStore(pool).Ensure(ctx, owner, ownerEmail, "Owner"); err != nil || p.Role != accounts.RoleAdmin {
		t.Fatalf("not persisted: role %q err %v", p.Role, err)
	}
}

func TestRenameAndDeleteAProfile(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewProfileStore(pool)
	id := uuid.NewString()
	if _, err := store.Ensure(ctx, id, id[:8]+"@example.com", "Old"); err != nil {
		t.Fatal(err)
	}
	if p, err := store.SetDisplayName(ctx, id, "New name"); err != nil || p.DisplayName != "New name" {
		t.Fatalf("rename: %+v %v", p, err)
	}
	if err := store.MarkDeleted(ctx, id); err != nil {
		t.Fatal(err)
	}
	p, err := store.Ensure(ctx, id, id[:8]+"@example.com", "x")
	if err != nil || p.DeletedAt == nil {
		t.Fatalf("after delete: %+v %v", p, err)
	}
	first := *p.DeletedAt
	if err := store.MarkDeleted(ctx, id); err != nil {
		t.Fatal(err)
	}
	if again, _ := store.Ensure(ctx, id, "", ""); again.DeletedAt == nil || !again.DeletedAt.Equal(first) {
		t.Fatalf("deleting twice moved the time: %+v", again.DeletedAt)
	}
}
