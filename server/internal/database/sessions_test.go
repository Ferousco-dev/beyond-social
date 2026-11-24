package database

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestSessionsAreAliveUntilSignedOutOrPastTheirEnd(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	store := NewSessionStore(pool)

	// Without Supabase's auth schema nothing can be checked, so nothing is locked out.
	if _, err := pool.Exec(ctx, `drop schema if exists auth cascade`); err != nil {
		t.Fatal(err)
	}
	if alive, err := store.Alive(ctx, uuid.NewString()); err != nil || !alive {
		t.Fatalf("no auth schema: alive=%v err=%v", alive, err)
	}

	// A stand-in for Supabase's table, with the columns the check reads.
	if _, err := pool.Exec(ctx, `create schema auth; create table auth.sessions (id uuid primary key, not_after timestamptz)`); err != nil {
		t.Fatal(err)
	}
	// The test context is already cancelled when clean-up runs, so it gets its own.
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), `drop schema if exists auth cascade`) })
	live, ended := uuid.NewString(), uuid.NewString()
	if _, err := pool.Exec(ctx, `insert into auth.sessions (id, not_after) values ($1, null), ($2, now() - interval '1 minute')`, live, ended); err != nil {
		t.Fatal(err)
	}
	for _, c := range []struct {
		name string
		id   string
		want bool
	}{
		{"a live session", live, true},
		{"a session past its end", ended, false},
		{"a signed-out session, deleted by Supabase", uuid.NewString(), false},
		{"something that is not a session id", "not-a-uuid", false},
	} {
		got, err := store.Alive(ctx, c.id)
		if err != nil || got != c.want {
			t.Errorf("%s: alive=%v err=%v, want %v", c.name, got, err, c.want)
		}
	}
}
