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
	if balance, _ := svc.Balance(ctx, id); balance != 25 {
		t.Fatalf("balance = %d, want 25", balance)
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

	sweeper := &credits.Sweeper{Open: NewCreditStore(pool), Jobs: biller, Searches: credits.NewDiscoveryBiller(svc), OlderThan: time.Minute}
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
	biller := credits.NewDiscoveryBiller(svc)

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
	biller := credits.NewDiscoveryBiller(svc)
	if err := biller.Reserve(ctx, userID, uuid.NewString()); err != nil {
		t.Fatal(err)
	}
	if err := biller.Reserve(ctx, userID, uuid.NewString()); !errors.Is(err, credits.ErrDailyLimit) {
		t.Fatalf("second search err = %v, want daily limit", err)
	}

	usage, err := admin.Usage(ctx, 1)
	if err != nil || len(usage) != 1 || usage[0].Action != credits.ActionDiscoverySearch || usage[0].Charged != 10 {
		t.Fatalf("usage = %+v err=%v", usage, err)
	}
	users, err := admin.FindUsers(ctx, "a@example", 5)
	if err != nil || len(users) != 1 || users[0].Balance != 90 {
		t.Fatalf("users = %+v err=%v", users, err)
	}
	if _, err := svc.Adjust(ctx, userID, -500, "k1", "oops", ""); !errors.Is(err, credits.ErrInsufficient) {
		t.Fatalf("overdraw adjust err = %v", err)
	}
}
