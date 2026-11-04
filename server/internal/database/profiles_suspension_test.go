package database

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestSuspendAndRestoreProfile(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewProfileStore(pool)
	id := uuid.NewString()
	if _, err := store.Ensure(ctx, id, id[:8]+"@example.com", "User"); err != nil {
		t.Fatal(err)
	}
	if updated, err := store.SetSuspended(ctx, id, true); err != nil || !updated {
		t.Fatalf("suspend: updated=%v err=%v", updated, err)
	}
	p, err := store.Ensure(ctx, id, "", "")
	if err != nil || p.SuspendedAt == nil {
		t.Fatalf("suspended profile: %+v err=%v", p, err)
	}
	first := *p.SuspendedAt
	if updated, err := store.SetSuspended(ctx, id, true); err != nil || !updated {
		t.Fatalf("repeat suspend: updated=%v err=%v", updated, err)
	}
	p, err = store.Ensure(ctx, id, "", "")
	if err != nil || p.SuspendedAt == nil || !p.SuspendedAt.Equal(first) {
		t.Fatalf("repeat suspend changed timestamp: %+v err=%v", p, err)
	}
	if updated, err := store.SetSuspended(ctx, id, false); err != nil || !updated {
		t.Fatalf("restore: updated=%v err=%v", updated, err)
	}
	p, err = store.Ensure(ctx, id, "", "")
	if err != nil || p.SuspendedAt != nil {
		t.Fatalf("restored profile: %+v err=%v", p, err)
	}
	if err := store.MarkDeleted(ctx, id); err != nil {
		t.Fatal(err)
	}
	if updated, err := store.SetSuspended(ctx, id, true); err != nil || updated {
		t.Fatalf("deleted profile must not be suspended: updated=%v err=%v", updated, err)
	}
}
