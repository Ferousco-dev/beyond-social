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
