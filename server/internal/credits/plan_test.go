package credits

import (
	"context"
	"errors"
	"testing"
	"time"
)

// memUsage is an in-memory UsageStore: one user, windows that never reset on their own.
type memUsage struct {
	plan       Plan
	five, week int
	events     map[string]*UsageEvent
	enabled    bool
	cap, used  int
	notified   time.Time
}

func newUsage(plan Plan) *memUsage { return &memUsage{plan: plan, events: map[string]*UsageEvent{}} }

func (u *memUsage) Plan(context.Context, string) (Plan, error) { return u.plan, nil }
func (u *memUsage) Take(_ context.Context, userID, jobID string, points int, l Limits, _ time.Time) (TakeResult, error) {
	if _, seen := u.events[jobID]; seen {
		return TakeResult{OK: true}, nil
	}
	if u.five >= l.FiveHour {
		return TakeResult{Window: WindowFiveHour, ResetsAt: time.Unix(1000, 0)}, nil
	}
	if u.week >= l.Week {
		return TakeResult{Window: WindowWeek, ResetsAt: time.Unix(2000, 0)}, nil
	}
	u.five, u.week = u.five+points, u.week+points
	u.events[jobID] = &UsageEvent{JobID: jobID, UserID: userID, Points: points}
	return TakeResult{OK: true}, nil
}
func (u *memUsage) Record(_ context.Context, ev UsageEvent) error {
	u.events[ev.JobID] = &ev
	if ev.Overage {
		u.used += ev.Credits
	}
	return nil
}
func (u *memUsage) Event(_ context.Context, jobID string) (UsageEvent, bool, error) {
	ev, ok := u.events[jobID]
	if !ok {
		return UsageEvent{}, false, nil
	}
	return *ev, true, nil
}
func (u *memUsage) Release(_ context.Context, jobID string, points int) error {
	ev := u.events[jobID]
	points = min(points, ev.Points)
	ev.Points -= points
	u.five, u.week = u.five-points, u.week-points
	return nil
}
func (u *memUsage) Overage(context.Context, string, time.Time) (bool, int, int, error) {
	return u.enabled, u.cap, u.used, nil
}
func (u *memUsage) SetOverage(context.Context, string, bool, int) error { return nil }
func (u *memUsage) MarkLimitNotified(_ context.Context, _ string, resetsAt time.Time) (bool, error) {
	if u.notified.Equal(resetsAt) {
		return false, nil
	}
	u.notified = resetsAt
	return true, nil
}
func (u *memUsage) Snapshot(context.Context, string, Limits, time.Time) (Snapshot, error) {
	return Snapshot{Plan: u.plan}, nil
}

func planService(plan Plan) (*Service, *memStore, *memUsage) {
	m := newMem()
	m.settings = map[string]int{SettingFreeMultiplier: 200, SettingLimitFiveHour: 40, SettingLimitWeek: 100}
	usage := newUsage(plan)
	return NewService(m).WithUsage(usage), m, usage
}

func TestFreeUsersPayDoubleAndGetTheDifferenceBackOnSettle(t *testing.T) {
	svc, m, _ := planService(PlanFree)
	ctx := context.Background()
	m.balance["u1"] = 100
	if err := svc.Reserve(ctx, "u1", "j1", 18, "video"); err != nil {
		t.Fatal(err)
	}
	if m.balance["u1"] != 64 {
		t.Fatalf("a free user should pay 36 for an 18 credit action, balance = %d", m.balance["u1"])
	}
	// The job turned out to need 10 normal credits, so 20 are kept and 16 come back.
	if err := svc.Settle(ctx, "u1", "j1", 10); err != nil {
		t.Fatal(err)
	}
	if m.balance["u1"] != 80 {
		t.Fatalf("balance = %d, want 80", m.balance["u1"])
	}
}

func TestFreeRefundReturnsEverythingThatWasTaken(t *testing.T) {
	svc, m, _ := planService(PlanFree)
	m.balance["u1"] = 100
	_ = svc.Reserve(context.Background(), "u1", "j1", 18, "video")
	if err := svc.Refund(context.Background(), "u1", "j1", "failed"); err != nil || m.balance["u1"] != 100 {
		t.Fatalf("balance = %d err=%v", m.balance["u1"], err)
	}
}

func TestProUsersSpendUsagePointsNotCredits(t *testing.T) {
	svc, m, usage := planService(PlanPro)
	ctx := context.Background()
	m.balance["u1"] = 7
	if err := svc.Reserve(ctx, "u1", "j1", 18, "video"); err != nil {
		t.Fatal(err)
	}
	if m.balance["u1"] != 7 || usage.five != 18 || usage.week != 18 {
		t.Fatalf("balance=%d five=%d week=%d", m.balance["u1"], usage.five, usage.week)
	}
	// Finishing for less than reserved returns the unused points; failing returns all.
	_ = svc.Settle(ctx, "u1", "j1", 8)
	if usage.five != 8 {
		t.Fatalf("five = %d after settling for 8", usage.five)
	}
	_ = svc.Settle(ctx, "u1", "j1", 8)
	if usage.five != 8 {
		t.Fatalf("settling twice changed usage: %d", usage.five)
	}
	_ = svc.Refund(ctx, "u1", "j1", "failed")
	if usage.five != 0 || usage.week != 0 {
		t.Fatalf("five=%d week=%d after a refund", usage.five, usage.week)
	}
}

func TestAProUserCanFinishWhatCrossesTheLimitThenIsStopped(t *testing.T) {
	svc, _, usage := planService(PlanPro)
	ctx := context.Background()
	if err := svc.Reserve(ctx, "u1", "a", 35, "x"); err != nil {
		t.Fatal(err)
	}
	// 35 of 40 used, so a 53 point job may still start and push past the limit.
	if err := svc.Reserve(ctx, "u1", "b", 53, "big"); err != nil || usage.five != 88 {
		t.Fatalf("five = %d err=%v", usage.five, err)
	}
	err := svc.Reserve(ctx, "u1", "c", 1, "one more")
	var limit *LimitError
	if !errors.Is(err, ErrLimitReached) || !errors.As(err, &limit) || limit.Window != WindowFiveHour || limit.ResetsAt.IsZero() {
		t.Fatalf("err = %v", err)
	}
}

func TestOverageSpendsCreditsOnlyWhenOnAndUnderTheCap(t *testing.T) {
	svc, m, usage := planService(PlanPro)
	ctx := context.Background()
	usage.five, usage.week = 40, 40
	m.balance["u1"] = 50

	if err := svc.Reserve(ctx, "u1", "j1", 18, "video"); !errors.Is(err, ErrLimitReached) {
		t.Fatalf("overage is off, so the limit must stop it: %v", err)
	}
	usage.enabled, usage.cap = true, 30
	if err := svc.Reserve(ctx, "u1", "j2", 18, "video"); err != nil {
		t.Fatal(err)
	}
	if m.balance["u1"] != 32 {
		t.Fatalf("overage is charged at the normal price, balance = %d", m.balance["u1"])
	}
	if err := svc.Reserve(ctx, "u1", "j3", 18, "video"); !errors.Is(err, ErrLimitReached) {
		t.Fatalf("the monthly cap of 30 must stop a second 18: %v", err)
	}
	// A refund of an overage job returns the credits.
	if err := svc.Refund(ctx, "u1", "j2", "failed"); err != nil || m.balance["u1"] != 50 {
		t.Fatalf("balance = %d err=%v", m.balance["u1"], err)
	}
}

func TestOverageWithNoCreditsLeftIsStillALimit(t *testing.T) {
	svc, m, usage := planService(PlanPro)
	usage.five, usage.week, usage.enabled, usage.cap = 40, 40, true, 100
	m.balance["u1"] = 3
	if err := svc.Reserve(context.Background(), "u1", "j1", 18, "x"); !errors.Is(err, ErrLimitReached) {
		t.Fatalf("err = %v", err)
	}
}

type countingNotifier struct{ windows []string }

func (n *countingNotifier) LimitReached(_ string, window string, _ time.Time) {
	n.windows = append(n.windows, window)
}

func TestAFullWindowSendsOneNoticeNoMatterHowOftenItIsHit(t *testing.T) {
	svc, _, usage := planService(PlanPro)
	notice := &countingNotifier{}
	svc.WithLimitNotifier(notice)
	usage.five, usage.week = 40, 40
	for i := 0; i < 3; i++ {
		if err := svc.Reserve(context.Background(), "u1", "j"+string(rune('a'+i)), 5, "x"); !errors.Is(err, ErrLimitReached) {
			t.Fatal(err)
		}
	}
	if len(notice.windows) != 1 || notice.windows[0] != WindowFiveHour {
		t.Fatalf("notices = %v", notice.windows)
	}
}
