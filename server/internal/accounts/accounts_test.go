package accounts

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeStore struct{ p Profile }

func (f fakeStore) Ensure(context.Context, string, string, string) (Profile, error) { return f.p, nil }

func TestActive(t *testing.T) {
	now := time.Now()
	ctx := context.Background()
	if _, err := NewService(fakeStore{Profile{ID: "u"}}).Active(ctx, "u", "e", "n"); err != nil {
		t.Fatalf("a normal account is active: %v", err)
	}
	if _, err := NewService(fakeStore{Profile{SuspendedAt: &now}}).Active(ctx, "u", "e", "n"); !errors.Is(err, ErrSuspended) {
		t.Fatalf("got %v", err)
	}
	// Deleted wins over suspended: a deleted account is gone, whatever else is true of it.
	if _, err := NewService(fakeStore{Profile{SuspendedAt: &now, DeletedAt: &now}}).Active(ctx, "u", "e", "n"); !errors.Is(err, ErrDeleted) {
		t.Fatalf("got %v", err)
	}
}
