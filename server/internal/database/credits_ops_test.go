package database

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/google/uuid"
)

func TestSignupGrantAppliedOnceAcrossRequests(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	svc := credits.NewService(NewCreditStore(pool))
	acc := accounts.NewService(NewProfileStore(pool)).WithGranter(svc)
	id := uuid.NewString()
	for range 3 {
		if _, err := acc.Active(ctx, id, "g@example.com", "G"); err != nil {
			t.Fatal(err)
		}
	}
	if balance, _ := svc.Balance(ctx, id); balance != 300 {
		t.Fatalf("balance = %d, want 300", balance)
	}
}

func TestSweeperClosesChargesTheNormalPathMissed(t *testing.T) {
	svc, store, userID := creditFixture(t, 40)
	pool := store.pool
	ctx := context.Background()
	biller := credits.NewJobBiller(svc)

	job := newJob(t, store, userID, "video_transform")
	job.Input = map[string]any{"duration": "5", "resolution": "720p"}
	if err := biller.Reserve(ctx, job); err != nil {
		t.Fatal(err)
	}
	// The job fails, but the process stops before the refund is written.
	if _, err := store.Advance(ctx, job.ID, jobs.Update{Status: jobs.StatusFailed, Error: "x"}); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `update public.jobs set updated_at = now() - interval '1 hour' where id = $1`, job.ID); err != nil {
		t.Fatal(err)
	}

	sweeper := &credits.Sweeper{Open: NewCreditStore(pool), Jobs: biller, Searches: credits.NewActionBiller(svc, credits.ActionDiscoverySearch), OlderThan: time.Minute}
	if n := sweeper.Once(ctx); n != 1 {
		t.Fatalf("closed %d, want 1", n)
	}
	if balance, _ := svc.Balance(ctx, userID); balance != 40 {
		t.Fatalf("balance = %d, want 40", balance)
	}
	if n := sweeper.Once(ctx); n != 0 {
		t.Fatalf("second sweep closed %d, want 0", n)
	}
}

func TestDiscoveryChargeRefundsOnFailureAndSettlesOnSuccess(t *testing.T) {
	svc, _, userID := creditFixture(t, 12)
	ctx := context.Background()
	biller := credits.NewActionBiller(svc, credits.ActionDiscoverySearch)

	a, b := uuid.NewString(), uuid.NewString()
	if err := biller.Reserve(ctx, userID, a); err != nil {
		t.Fatal(err)
	}
	if err := biller.Reserve(ctx, userID, b); err != nil {
		t.Fatal(err)
	}
	if err := biller.Reserve(ctx, userID, uuid.NewString()); !errors.Is(err, credits.ErrInsufficient) {
		t.Fatalf("third search err = %v", err)
	}
	if err := biller.Close(ctx, userID, a, false); err != nil {
		t.Fatal(err)
	}
	if err := biller.Close(ctx, userID, b, true); err != nil {
		t.Fatal(err)
	}
	if balance, _ := svc.Balance(ctx, userID); balance != 7 {
		t.Fatalf("balance = %d, want 7 (12 - 5 for the delivered search)", balance)
	}
	var _ discovery.Biller = biller
}

func TestAdminPriceEditsSettingsAndDailyLimit(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewCreditStore(pool)
	svc := credits.NewService(store)
	admin := credits.NewAdmin(NewAdminCreditStore(store))
	userID := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, userID, "a@example.com", "A"); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Grant(ctx, userID, 100, "t:"+userID, "test"); err != nil {
		t.Fatal(err)
	}

	cost, margin := 0.2, 1.5
	row, err := admin.UpdatePrice(ctx, credits.ActionDiscoverySearch, credits.PricePatch{CostUSD: &cost, Margin: &margin}, "")
	if err != nil || row.Credits != 10 {
		t.Fatalf("price = %+v err=%v, want 10 credits", row, err)
	}
	if _, err := admin.UpdatePrice(ctx, "no_such_action", credits.PricePatch{}, ""); !errors.Is(err, credits.ErrUnavailable) {
		t.Fatalf("unknown action err = %v", err)
	}
	if err := admin.SetSetting(ctx, "not_a_setting", 5, ""); !errors.Is(err, credits.ErrInvalid) {
		t.Fatalf("unknown setting err = %v", err)
	}

	if err := admin.SetSetting(ctx, credits.SettingDailyUserLimit, 15, ""); err != nil {
		t.Fatal(err)
	}
	biller := credits.NewActionBiller(svc, credits.ActionDiscoverySearch)
	if err := biller.Reserve(ctx, userID, uuid.NewString()); err != nil {
		t.Fatal(err)
	}
	if err := biller.Reserve(ctx, userID, uuid.NewString()); !errors.Is(err, credits.ErrDailyLimit) {
		t.Fatalf("second search err = %v, want daily limit", err)
	}

	report, err := admin.Usage(ctx, 1)
	usage := report.Actions
	if err != nil || len(usage) != 1 || usage[0].Action != credits.ActionDiscoverySearch || usage[0].Charged != 10 {
		t.Fatalf("usage = %+v err=%v", usage, err)
	}
	users, err := admin.FindUsers(ctx, "a@example", credits.SegmentActive, 5)
	if err != nil || len(users) != 1 || users[0].Balance != 90 {
		t.Fatalf("users = %+v err=%v", users, err)
	}
	if _, err := svc.Adjust(ctx, userID, -500, "k1", "oops", ""); !errors.Is(err, credits.ErrInsufficient) {
		t.Fatalf("overdraw adjust err = %v", err)
	}
}

func TestSegmentsAndProviderSpend(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewCreditStore(pool)
	admin := credits.NewAdmin(NewAdminCreditStore(store))
	profiles := NewProfileStore(pool)
	fresh, payer, idle := uuid.NewString(), uuid.NewString(), uuid.NewString()
	for _, id := range []string{fresh, payer, idle} {
		if _, err := profiles.Ensure(ctx, id, id[:8]+"@example.com", "U"); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := profiles.SetSuspended(ctx, payer, true); err != nil {
		t.Fatal(err)
	}
	if _, _, err := store.Apply(ctx, credits.Entry{UserID: payer, Kind: credits.KindPurchase, Amount: 500, Key: "p:" + payer}); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `update public.profiles set created_at = now() - interval '90 days' where id = any($1)`, []string{payer, idle}); err != nil {
		t.Fatal(err)
	}
	if err := credits.NewActionBiller(credits.NewService(store), credits.ActionDiscoverySearch).Reserve(ctx, payer, uuid.NewString()); err != nil {
		t.Fatal(err)
	}

	counts, err := admin.SegmentCounts(ctx)
	if err != nil || counts.Total != 3 || counts.New != 1 || counts.Paid != 1 || counts.Active != 1 {
		t.Fatalf("counts = %+v err=%v", counts, err)
	}
	paid, err := admin.FindUsers(ctx, "", credits.SegmentPaid, 10)
	if err != nil || len(paid) != 1 || paid[0].ID != payer || !paid[0].Suspended {
		t.Fatalf("paid = %+v err=%v", paid, err)
	}
	detail, err := NewAdminCreditStore(store).UserDetail(ctx, payer)
	if err != nil || detail.Email != payer[:8]+"@example.com" || detail.Plan != "Free" || detail.AccountStatus != "suspended" || detail.SubscriptionStatus != "none" {
		t.Fatalf("user detail = %+v err=%v", detail, err)
	}
	if _, err := admin.FindUsers(ctx, "", credits.Segment("vip"), 10); !errors.Is(err, credits.ErrInvalid) {
		t.Fatalf("unknown segment err = %v", err)
	}

	// 100 -> 80 is a spend of 20, 80 -> 150 is a top-up, 150 -> 140 is 10 more.
	for _, amount := range []float64{100, 80, 150, 140} {
		if err := store.SaveSnapshot(ctx, "kie", amount, "credits"); err != nil {
			t.Fatal(err)
		}
		time.Sleep(5 * time.Millisecond)
	}
	report, err := admin.Usage(ctx, 1)
	if err != nil || len(report.Providers) != 1 || report.Providers[0].Spent != 30 {
		t.Fatalf("provider spend = %+v err=%v", report.Providers, err)
	}
}
