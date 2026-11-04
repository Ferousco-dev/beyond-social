package database

import (
	"context"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/google/uuid"
)

func TestWeekStartIsTheMondayBefore(t *testing.T) {
	for in, want := range map[string]string{
		"2026-10-12T00:00:00Z": "2026-10-12", // a Monday, just at the start
		"2026-10-13T15:30:00Z": "2026-10-12",
		"2026-10-18T23:59:59Z": "2026-10-12", // Sunday night
		"2026-10-19T00:00:01Z": "2026-10-19",
	} {
		at, _ := time.Parse(time.RFC3339, in)
		if got := WeekStart(at).Format("2006-01-02"); got != want {
			t.Errorf("WeekStart(%s) = %s, want %s", in, got, want)
		}
	}
}

func newProUser(t *testing.T, status string) (*UsageStore, string) {
	t.Helper()
	pool := testPool(t)
	ctx := context.Background()
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, user[:8]+"@example.com", "U"); err != nil {
		t.Fatal(err)
	}
	if status != "" {
		if _, err := pool.Exec(ctx, `insert into public.subscriptions (user_id, status, current_period_end) values ($1, $2, now() + interval '20 days')`, user, status); err != nil {
			t.Fatal(err)
		}
	}
	return NewUsageStore(pool), user
}

func TestPlanFollowsTheSubscription(t *testing.T) {
	ctx := context.Background()
	for status, want := range map[string]credits.Plan{"": credits.PlanFree, "active": credits.PlanPro, "trialing": credits.PlanPro, "canceled": credits.PlanFree, "incomplete": credits.PlanFree} {
		store, user := newProUser(t, status)
		if got, err := store.Plan(ctx, user); err != nil || got != want {
			t.Errorf("status %q: plan %q err %v, want %q", status, got, err, want)
		}
	}
	// A failed renewal keeps Pro for a few days, then stops.
	store, user := newProUser(t, "past_due")
	if got, _ := store.Plan(ctx, user); got != credits.PlanPro {
		t.Errorf("past due inside the grace period: %q", got)
	}
	if _, err := store.pool.Exec(ctx, `update public.subscriptions set current_period_end = now() - interval '4 days' where user_id = $1`, user); err != nil {
		t.Fatal(err)
	}
	if got, _ := store.Plan(ctx, user); got != credits.PlanFree {
		t.Errorf("past due beyond the grace period: %q", got)
	}
}

func TestWindowsFillRefundAndRefill(t *testing.T) {
	store, user := newProUser(t, "active")
	ctx := context.Background()
	limits := credits.Limits{FiveHour: 40, Week: 100}
	now := time.Date(2026, 10, 14, 12, 0, 0, 0, time.UTC) // a Wednesday

	take := func(job string, points int, at time.Time) credits.TakeResult {
		r, err := store.Take(ctx, user, job+user, points, limits, at)
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	if !take("a", 35, now).OK {
		t.Fatal("the first action was refused")
	}
	// Repeating the same job does not count it twice.
	if !take("a", 35, now).OK {
		t.Fatal("a repeat of the same job was refused")
	}
	// 35 of 40 used: the next may start and overshoot.
	if !take("b", 53, now.Add(time.Hour)).OK {
		t.Fatal("an action that crosses the limit must be allowed")
	}
	full := take("c", 1, now.Add(2*time.Hour))
	if full.OK || full.Window != credits.WindowFiveHour || !full.ResetsAt.Equal(now.Add(5*time.Hour)) {
		t.Fatalf("a full window: %+v", full)
	}
	// Giving a job's points back reopens the window.
	if err := store.Release(ctx, "b"+user, 53); err != nil {
		t.Fatal(err)
	}
	if !take("d", 5, now.Add(2*time.Hour)).OK {
		t.Fatal("the window did not reopen after a refund")
	}
	// After five hours a new window starts. The weekly total carries on.
	if !take("e", 50, now.Add(6*time.Hour)).OK {
		t.Fatal("the next window was refused")
	}
	snap, err := store.Snapshot(ctx, user, limits, now.Add(6*time.Hour))
	if err != nil || snap.FiveUsed != 50 || snap.WeekUsed != 90 || snap.Plan != credits.PlanPro {
		t.Fatalf("snapshot = %+v err %v", snap, err)
	}
	if !take("f", 20, now.Add(12*time.Hour)).OK {
		t.Fatal("the week had room left")
	}
	weekly := take("g", 1, now.Add(18*time.Hour))
	if weekly.OK || weekly.Window != credits.WindowWeek || !weekly.ResetsAt.Equal(time.Date(2026, 10, 19, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("a full week: %+v", weekly)
	}
	// Monday brings it back.
	if !take("h", 1, time.Date(2026, 10, 19, 0, 0, 1, 0, time.UTC)).OK {
		t.Fatal("the week did not refill on Monday")
	}
}

func TestOverageSettingsAndSpend(t *testing.T) {
	store, user := newProUser(t, "active")
	ctx := context.Background()
	if on, limit, used, err := store.Overage(ctx, user, time.Now().AddDate(0, -1, 0)); err != nil || on || limit != 0 || used != 0 {
		t.Fatalf("defaults: %v %d %d %v", on, limit, used, err)
	}
	if err := store.SetOverage(ctx, user, true, 300); err != nil {
		t.Fatal(err)
	}
	if err := store.Record(ctx, credits.UsageEvent{JobID: "o1" + user, UserID: user, Credits: 40, MultPct: 100, Overage: true}); err != nil {
		t.Fatal(err)
	}
	if err := store.Record(ctx, credits.UsageEvent{JobID: "n1" + user, UserID: user, Credits: 99, MultPct: 200}); err != nil {
		t.Fatal(err)
	}
	on, limit, used, err := store.Overage(ctx, user, time.Now().AddDate(0, 0, -1))
	if err != nil || !on || limit != 300 || used != 40 {
		t.Fatalf("overage: %v %d %d %v", on, limit, used, err)
	}
	ev, found, err := store.Event(ctx, "n1"+user)
	if err != nil || !found || ev.MultPct != 200 || ev.Credits != 99 {
		t.Fatalf("event: %+v %v %v", ev, found, err)
	}
}

func TestALimitNoticeIsFirstOnlyOncePerWindow(t *testing.T) {
	store, user := newProUser(t, "active")
	ctx := context.Background()
	if _, err := store.pool.Exec(ctx, `insert into public.usage_state (user_id) values ($1) on conflict do nothing`, user); err != nil {
		t.Fatal(err)
	}
	reset := time.Date(2026, 10, 14, 15, 0, 0, 0, time.UTC)
	if first, err := store.MarkLimitNotified(ctx, user, reset); err != nil || !first {
		t.Fatalf("first: %v %v", first, err)
	}
	if again, _ := store.MarkLimitNotified(ctx, user, reset); again {
		t.Fatal("the same window was reported twice")
	}
	if next, _ := store.MarkLimitNotified(ctx, user, reset.Add(5*time.Hour)); !next {
		t.Fatal("a later window was not reported")
	}
}
