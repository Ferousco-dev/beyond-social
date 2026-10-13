package database

import (
	"context"
	"slices"
	"testing"

	"github.com/google/uuid"
)

// A table that gains a user_id column must be chosen as erased or kept, so a new
// feature cannot quietly leave a deleted person's data behind.
func TestEveryTableWithAUserIsErasedOrDeliberatelyKept(t *testing.T) {
	pool := testPool(t)
	rows, err := pool.Query(context.Background(), `
		select distinct table_name from information_schema.columns
		where table_schema = 'public' and column_name = 'user_id' and table_name not like 'pg_%'`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var table string
		if err := rows.Scan(&table); err != nil {
			t.Fatal(err)
		}
		if !slices.Contains(ErasedTables, table) && !slices.Contains(KeptTables, table) {
			t.Errorf("table %s has a user_id but is neither erased nor kept: add it to ErasedTables or KeptTables", table)
		}
	}
}

func TestErasingAnAccountRemovesContentAndKeepsTheMoneyRecords(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	user, other := uuid.NewString(), uuid.NewString()
	profiles := NewProfileStore(pool)
	for _, id := range []string{user, other} {
		if _, err := profiles.Ensure(ctx, id, id[:8]+"@example.com", "Name"); err != nil {
			t.Fatal(err)
		}
	}
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, sql, args...); err != nil {
			t.Fatalf("%s: %v", sql, err)
		}
	}
	seed := func(id string) {
		var conv string
		if err := pool.QueryRow(ctx, `insert into public.conversations (user_id, title) values ($1, 'x') returning id::text`, id).Scan(&conv); err != nil {
			t.Fatal(err)
		}
		exec(`insert into public.messages (conversation_id, user_id, role, content) values ($1, $2, 'user', 'hi')`, conv, id)
		exec(`insert into public.editor_projects (user_id, conversation_id) values ($1, $2)`, id, conv)
		exec(`insert into public.media (user_id, kind, name, mime_type, size_bytes, path) values ($1, 'image', 'a.png', 'image/png', 5, $2)`, id, id+"/"+uuid.NewString()+".png")
		exec(`insert into public.jobs (user_id, job_type, status) values ($1, 'video_generate', 'completed')`, id)
		exec(`insert into public.usage_state (user_id) values ($1)`, id)
		exec(`insert into public.payments (user_id, pack_name, credits, amount_cents, currency, status) values ($1, 'Starter', 200, 1000, 'usd', 'paid')`, id)
		exec(`insert into public.credit_ledger (user_id, kind, amount, balance_after, idempotency_key) values ($1, 'grant', 50, 50, $2)`, id, "seed:"+id)
	}
	seed(user)
	seed(other)

	store := NewPurgeStore(pool)
	paths, err := store.Paths(ctx, user)
	if err != nil || len(paths.Media) != 1 {
		t.Fatalf("paths = %+v %v", paths, err)
	}
	exec(`update public.profiles set deleted_at = now() where id = $1`, user)
	if pending, _ := store.Pending(ctx, 1000); !slices.Contains(pending, user) || slices.Contains(pending, other) {
		t.Fatalf("pending = %v", pending)
	}
	if err := store.Erase(ctx, user); err != nil {
		t.Fatal(err)
	}

	count := func(table, id string) int {
		var n int
		if err := pool.QueryRow(ctx, `select count(*) from public.`+table+` where user_id = $1`, id).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}
	for _, table := range ErasedTables {
		if n := count(table, user); n != 0 {
			t.Errorf("%s still has %d rows for the deleted account", table, n)
		}
	}
	for _, table := range []string{"payments", "credit_ledger"} {
		if n := count(table, user); n != 1 {
			t.Errorf("%s lost its record: %d rows", table, n)
		}
	}
	for _, table := range []string{"conversations", "messages", "editor_projects", "media", "jobs", "usage_state", "payments", "credit_ledger"} {
		if n := count(table, other); n != 1 {
			t.Errorf("%s: another account's %d rows were touched", table, n)
		}
	}
	var email, name string
	if err := pool.QueryRow(ctx, `select email, display_name from public.profiles where id = $1`, user).Scan(&email, &name); err != nil || name != "" || email == user[:8]+"@example.com" {
		t.Fatalf("profile = %q %q %v", email, name, err)
	}
	if pending, _ := store.Pending(ctx, 1000); slices.Contains(pending, user) {
		t.Fatal("a purged account is still pending")
	}
	// Erasing again changes nothing and does not fail.
	if err := store.Erase(ctx, user); err != nil {
		t.Fatalf("a second erase: %v", err)
	}
}
