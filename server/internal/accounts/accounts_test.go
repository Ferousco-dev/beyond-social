package accounts

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

type fakeStore struct{ p Profile }

func (f fakeStore) Ensure(context.Context, string, string, string) (Profile, error) { return f.p, nil }

func (fakeStore) MarkGranted(context.Context, string) error { return nil }
func (f fakeStore) SetDisplayName(_ context.Context, id, name string) (Profile, error) {
	p := f.p
	p.ID, p.DisplayName = id, name
	return p, nil
}
func (fakeStore) MarkDeleted(context.Context, string) error { return nil }

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

type recordingRemover struct {
	err   error
	asked []string
}

func (r *recordingRemover) RemoveUser(_ context.Context, id string) error {
	r.asked = append(r.asked, id)
	return r.err
}

type deletingStore struct {
	fakeStore
	deleted bool
}

func (d *deletingStore) MarkDeleted(context.Context, string) error {
	d.deleted = true
	return nil
}

func TestRenameChecksTheName(t *testing.T) {
	svc := NewService(fakeStore{p: Profile{ID: "u1"}})
	if p, err := svc.Rename(context.Background(), "u1", "  Ada  "); err != nil || p.DisplayName != "Ada" {
		t.Fatalf("%+v %v", p, err)
	}
	for _, bad := range []string{"", "   ", strings.Repeat("a", 81), "bad\x00name"} {
		if _, err := svc.Rename(context.Background(), "u1", bad); !errors.Is(err, ErrInvalidName) {
			t.Errorf("%q accepted: %v", bad, err)
		}
	}
}

func TestDeletingNeedsTheEmailAndRemovesTheSignInFirst(t *testing.T) {
	store, remover := &deletingStore{}, &recordingRemover{}
	svc := NewService(store)
	ctx := context.Background()
	if err := svc.Delete(ctx, "u1", "a@b.c", "wrong@b.c", remover); !errors.Is(err, ErrConfirmMismatch) || store.deleted || len(remover.asked) != 0 {
		t.Fatalf("a wrong email went ahead: %v deleted=%v asked=%v", err, store.deleted, remover.asked)
	}
	if err := svc.Delete(ctx, "u1", "", "", remover); !errors.Is(err, ErrConfirmMismatch) {
		t.Fatalf("an empty email: %v", err)
	}
	remover.err = errors.New("auth is down")
	if err := svc.Delete(ctx, "u1", "a@b.c", "A@B.C", remover); err == nil || store.deleted {
		t.Fatalf("a failed sign-in removal still deleted the profile: %v deleted=%v", err, store.deleted)
	}
	remover.err = nil
	if err := svc.Delete(ctx, "u1", "a@b.c", " A@B.C ", remover); err != nil || !store.deleted {
		t.Fatalf("delete: %v deleted=%v", err, store.deleted)
	}
}
