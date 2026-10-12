package accounts

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeStore struct{ p Profile }

func (f fakeStore) Ensure(context.Context, string, string, string) (Profile, error) { return f.p, nil }

func (fakeStore) MarkGranted(context.Context, string) error { return nil }

type countingGranter struct{ calls int }

func (g *countingGranter) SignupGrant(context.Context, string) error { g.calls++; return nil }

func TestActiveGrantsOnlyUntilMarked(t *testing.T) {
	g := &countingGranter{}
	svc := NewService(fakeStore{p: Profile{ID: "u1"}}).WithGranter(g)
	if _, err := svc.Active(context.Background(), "u1", "a@b.c", "A"); err != nil || g.calls != 1 {
		t.Fatalf("calls=%d err=%v", g.calls, err)
	}
	granted := time.Now()
	svc = NewService(fakeStore{p: Profile{ID: "u1", GrantedAt: &granted}}).WithGranter(g)
	if _, err := svc.Active(context.Background(), "u1", "a@b.c", "A"); err != nil || g.calls != 1 {
		t.Fatalf("a granted profile must not be granted again: calls=%d", g.calls)
	}
}

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
