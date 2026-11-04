package database

import (
	"context"
	"errors"
	"sync"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/google/uuid"
)

func creditFixture(t *testing.T, balance int) (*credits.Service, *JobStore, string) {
	t.Helper()
	pool := testPool(t)
	userID := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(context.Background(), userID, "c@example.com", "C"); err != nil {
		t.Fatal(err)
	}
	svc := credits.NewService(NewCreditStore(pool))
	if balance > 0 {
		if _, err := svc.Grant(context.Background(), userID, balance, "test:"+userID, "test"); err != nil {
			t.Fatal(err)
		}
	}
	return svc, NewJobStore(pool), userID
}

func TestCreditsConcurrentReservesNeverOverspend(t *testing.T) {
	svc, store, userID := creditFixture(t, 54)
	var wg sync.WaitGroup
	var mu sync.Mutex
	ok, short := 0, 0
	for range 12 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			job := newJob(t, store, userID, "video_transform")
			err := svc.Reserve(context.Background(), userID, job.ID, 18, "test")
			mu.Lock()
			defer mu.Unlock()
			switch {
			case err == nil:
				ok++
			case errors.Is(err, credits.ErrInsufficient):
				short++
			default:
				t.Errorf("unexpected error: %v", err)
			}
		}()
	}
	wg.Wait()
	balance, _ := svc.Balance(context.Background(), userID)
	if ok != 3 || short != 9 || balance != 0 {
		t.Fatalf("ok=%d short=%d balance=%d", ok, short, balance)
	}
}

func TestCreditsRefundIsIdempotentAndExclusiveWithSettle(t *testing.T) {
	svc, store, userID := creditFixture(t, 40)
	ctx := context.Background()
	job := newJob(t, store, userID, "video_transform")
	if err := svc.Reserve(ctx, userID, job.ID, 18, "test"); err != nil {
		t.Fatal(err)
	}
	for range 3 {
		if err := svc.Refund(ctx, userID, job.ID, "failed"); err != nil {
			t.Fatal(err)
		}
	}
	if err := svc.Settle(ctx, userID, job.ID, 18); err != nil {
		t.Fatal(err)
	}
	if balance, _ := svc.Balance(ctx, userID); balance != 40 {
		t.Fatalf("balance = %d, want 40", balance)
	}
}

func TestJobServiceChargesAndRefundsThroughTheHook(t *testing.T) {
	svc, store, userID := creditFixture(t, 20)
	ctx := context.Background()
	js := jobs.NewService(store, nil).WithBiller(credits.NewJobBiller(svc))
	input := map[string]any{"duration": "5", "resolution": "720p"}

	job, isNew, err := js.Create(ctx, userID, "video_transform", input, "k1")
	if err != nil || !isNew {
		t.Fatalf("create: %v new=%v", err, isNew)
	}
	if balance, _ := svc.Balance(ctx, userID); balance != 2 {
		t.Fatalf("after reserve balance = %d, want 2", balance)
	}
	// A repeat of the same request is not charged again.
	if _, isNew, err := js.Create(ctx, userID, "video_transform", input, "k1"); err != nil || isNew {
		t.Fatalf("repeat: %v new=%v", err, isNew)
	}
	if balance, _ := svc.Balance(ctx, userID); balance != 2 {
		t.Fatalf("repeat charged: balance = %d", balance)
	}
	// Not enough for a second one: refused, and no stray queued job is left.
	if _, _, err := js.Create(ctx, userID, "video_transform", input, "k2"); !errors.Is(err, credits.ErrInsufficient) {
		t.Fatalf("err = %v", err)
	}
	if n, _ := js.CountActive(ctx, userID, "video_transform"); n != 1 {
		t.Fatalf("active jobs = %d, want 1", n)
	}

	if _, err := js.Advance(ctx, job.ID, jobs.Update{Status: jobs.StatusRunning}); err != nil {
		t.Fatal(err)
	}
	if _, err := js.Advance(ctx, job.ID, jobs.Update{Status: jobs.StatusFailed, Error: "provider"}); err != nil {
		t.Fatal(err)
	}
	if balance, _ := svc.Balance(ctx, userID); balance != 20 {
		t.Fatalf("after failure balance = %d, want 20", balance)
	}
}
