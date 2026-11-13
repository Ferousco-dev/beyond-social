package database

import (
	"context"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/google/uuid"
)

func TestSpendIsRecordedOncePerJobAndReported(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, "spender@example.com", "Spender"); err != nil {
		t.Fatal(err)
	}
	store := NewSpendStore(pool)

	provider, cost, ok, err := store.UnitCost(ctx, "video_transform:5:720p")
	if err != nil || !ok || provider != "kie" || cost <= 0 {
		t.Fatalf("seeded price should be readable: %q %v %v %v", provider, cost, ok, err)
	}
	if _, _, ok, _ := store.UnitCost(ctx, "no_such_action"); ok {
		t.Fatal("an unknown action must report not found")
	}

	sp := credits.Spend{JobID: "job-a", UserID: user, Provider: "kie", JobType: "video_transform", Action: "video_transform:5:720p", Units: 1, CostUSD: 0.35}
	for range 2 { // a repeat must not double count
		if err := store.RecordSpend(ctx, sp); err != nil {
			t.Fatal(err)
		}
	}
	sp.JobID, sp.CostUSD = "job-b", 0.70
	if err := store.RecordSpend(ctx, sp); err != nil {
		t.Fatal(err)
	}
	NewAIUsageStore(pool).RecordUsage(ctx, gemini.Record{Provider: "gemini", Model: "m", UserID: user,
		Usage: gemini.Usage{PromptTokens: 10, CandidatesTokens: 5, TotalTokens: 15}})

	rep, err := store.Report(ctx, 30)
	if err != nil {
		t.Fatal(err)
	}
	if len(rep.Providers) != 1 || rep.Providers[0].Jobs != 2 || rep.Providers[0].CostUSD < 1.049 || rep.Providers[0].CostUSD > 1.051 {
		t.Fatalf("want 2 jobs costing 1.05, got %+v", rep.Providers)
	}
	if len(rep.Users) != 1 || rep.Users[0].Email != "spender@example.com" || rep.Users[0].Jobs != 2 {
		t.Fatalf("top users wrong: %+v", rep.Users)
	}
	if len(rep.Models) != 1 || rep.Models[0].InputTokens != 10 || rep.Models[0].OutputTokens != 5 {
		t.Fatalf("model usage wrong: %+v", rep.Models)
	}
	if len(rep.Daily) != 1 || rep.Daily[0].Tokens != 15 {
		t.Fatalf("daily series wrong: %+v", rep.Daily)
	}
}
