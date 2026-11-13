package database

import (
	"context"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
)

func TestAIUsageStoreRecordsAndKeepsRowsWhenAccountIsDeleted(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	const user = "11111111-1111-1111-1111-111111111111"
	if _, err := pool.Exec(ctx, `insert into public.profiles (id) values ($1)`, user); err != nil {
		t.Skipf("cannot seed a profile in this schema: %v", err)
	}
	store := NewAIUsageStore(pool)
	store.RecordUsage(ctx, gemini.Record{Provider: "gemini", Model: "m", Purpose: "plan", UserID: user, JobID: "j",
		Usage: gemini.Usage{PromptTokens: 7, CandidatesTokens: 3, TotalTokens: 10}})
	store.RecordUsage(ctx, gemini.Record{Provider: "gemini", Model: "m"}) // no user, no job

	var n, total int
	if err := pool.QueryRow(ctx, `select count(*), coalesce(sum(total_tokens),0) from public.ai_usage`).Scan(&n, &total); err != nil {
		t.Fatal(err)
	}
	if n != 2 || total != 10 {
		t.Fatalf("want 2 rows and 10 tokens, got %d and %d", n, total)
	}
	if _, err := pool.Exec(ctx, `delete from public.profiles where id = $1`, user); err != nil {
		t.Fatal(err)
	}
	var kept int
	if err := pool.QueryRow(ctx, `select count(*) from public.ai_usage where user_id is null`).Scan(&kept); err != nil {
		t.Fatal(err)
	}
	if kept != 2 {
		t.Fatalf("deleting the account must keep usage rows with a null user, got %d", kept)
	}
}

func TestAIUsageStoreFallsBackToTheRequestUser(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewAIUsageStore(pool)
	store.UserFallback = func(context.Context) string { return "" }
	store.RecordUsage(ctx, gemini.Record{Provider: "gemini", Model: "m"})
	var n int
	if err := pool.QueryRow(ctx, `select count(*) from public.ai_usage`).Scan(&n); err != nil || n != 1 {
		t.Fatalf("want 1 row, got %d (%v)", n, err)
	}
}
