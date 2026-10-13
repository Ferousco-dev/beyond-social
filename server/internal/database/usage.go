package database

import (
	"context"
	"errors"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const fiveHours = 5 * time.Hour

// UsageStore implements credits.UsageStore.
type UsageStore struct{ pool *pgxpool.Pool }

func NewUsageStore(pool *pgxpool.Pool) *UsageStore { return &UsageStore{pool: pool} }

// WeekStart is the Monday 00:00 UTC on or before t, when the weekly limit last refilled.
func WeekStart(t time.Time) time.Time {
	t = t.UTC()
	back := (int(t.Weekday()) + 6) % 7
	return time.Date(t.Year(), t.Month(), t.Day()-back, 0, 0, 0, 0, time.UTC)
}

func (s *UsageStore) Plan(ctx context.Context, userID string) (credits.Plan, error) {
	var pro bool
	err := s.pool.QueryRow(ctx, `
		select exists (
			select 1 from public.subscriptions
			where user_id = $1
			  and (status in ('active', 'trialing')
			       or (status = 'past_due' and current_period_end + interval '3 days' > now())))`, userID).Scan(&pro)
	if err != nil {
		return credits.PlanFree, err
	}
	if pro {
		return credits.PlanPro, nil
	}
	return credits.PlanFree, nil
}

type state struct {
	fiveStart  *time.Time
	fivePoints int
	weekStart  *time.Time
	weekPoints int
}

// current brings a stored state up to now: an ended window counts as empty.
func (st state) current(now time.Time) state {
	if st.fiveStart == nil || !now.Before(st.fiveStart.Add(fiveHours)) {
		st.fiveStart, st.fivePoints = nil, 0
	}
	week := WeekStart(now)
	if st.weekStart == nil || !st.weekStart.Equal(week) {
		st.weekStart, st.weekPoints = &week, 0
	}
	return st
}

func lockState(ctx context.Context, tx pgx.Tx, userID string) (state, error) {
	if _, err := tx.Exec(ctx, `insert into public.usage_state (user_id) values ($1) on conflict do nothing`, userID); err != nil {
		return state{}, err
	}
	var st state
	err := tx.QueryRow(ctx, `select five_start, five_points, week_start, week_points from public.usage_state where user_id = $1 for update`, userID).
		Scan(&st.fiveStart, &st.fivePoints, &st.weekStart, &st.weekPoints)
	return st, err
}

func (s *UsageStore) Take(ctx context.Context, userID, jobID string, points int, limits credits.Limits, now time.Time) (credits.TakeResult, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return credits.TakeResult{}, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // rollback after commit is a no-op

	st, err := lockState(ctx, tx, userID)
	if err != nil {
		return credits.TakeResult{}, err
	}
	var seen bool
	if err := tx.QueryRow(ctx, `select exists (select 1 from public.usage_events where job_id = $1)`, jobID).Scan(&seen); err != nil {
		return credits.TakeResult{}, err
	}
	if seen {
		return credits.TakeResult{OK: true}, nil
	}
	st = st.current(now)
	// A window is full once it has reached its limit. The action that crosses the
	// limit is allowed, so one large job can still run in a small window.
	if limits.FiveHour > 0 && st.fivePoints >= limits.FiveHour && st.fiveStart != nil {
		return credits.TakeResult{Window: credits.WindowFiveHour, ResetsAt: st.fiveStart.Add(fiveHours)}, nil
	}
	if limits.Week > 0 && st.weekPoints >= limits.Week {
		return credits.TakeResult{Window: credits.WindowWeek, ResetsAt: st.weekStart.AddDate(0, 0, 7)}, nil
	}
	if st.fiveStart == nil {
		st.fiveStart = &now
	}
	st.fivePoints += points
	st.weekPoints += points
	if _, err := tx.Exec(ctx, `update public.usage_state set five_start = $2, five_points = $3, week_start = $4, week_points = $5 where user_id = $1`,
		userID, st.fiveStart, st.fivePoints, st.weekStart, st.weekPoints); err != nil {
		return credits.TakeResult{}, err
	}
	if _, err := tx.Exec(ctx, `insert into public.usage_events (job_id, user_id, points, five_start, week_start) values ($1, $2, $3, $4, $5)`,
		jobID, userID, points, st.fiveStart, st.weekStart); err != nil {
		return credits.TakeResult{}, err
	}
	return credits.TakeResult{OK: true}, tx.Commit(ctx)
}

func (s *UsageStore) Record(ctx context.Context, ev credits.UsageEvent) error {
	_, err := s.pool.Exec(ctx, `
		insert into public.usage_events (job_id, user_id, credits, mult_pct, overage) values ($1, $2, $3, $4, $5)
		on conflict (job_id) do nothing`, ev.JobID, ev.UserID, ev.Credits, max(ev.MultPct, 1), ev.Overage)
	return err
}

func (s *UsageStore) Event(ctx context.Context, jobID string) (credits.UsageEvent, bool, error) {
	var ev credits.UsageEvent
	err := s.pool.QueryRow(ctx, `select job_id, user_id::text, points, credits, mult_pct, overage from public.usage_events where job_id = $1`, jobID).
		Scan(&ev.JobID, &ev.UserID, &ev.Points, &ev.Credits, &ev.MultPct, &ev.Overage)
	if errors.Is(err, pgx.ErrNoRows) {
		return ev, false, nil
	}
	return ev, err == nil, err
}

// Release gives points back. They come off the windows only if those are the
// windows the points were counted in; an ended window has nothing to give back.
func (s *UsageStore) Release(ctx context.Context, jobID string, points int) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // rollback after commit is a no-op

	var userID string
	var held int
	var five, week *time.Time
	err = tx.QueryRow(ctx, `select user_id::text, points, five_start, week_start from public.usage_events where job_id = $1 for update`, jobID).Scan(&userID, &held, &five, &week)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	points = min(points, held)
	if points <= 0 {
		return nil
	}
	if _, err := tx.Exec(ctx, `update public.usage_events set points = points - $2 where job_id = $1`, jobID, points); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		update public.usage_state set
			five_points = case when five_start is not distinct from $2 then greatest(five_points - $4, 0) else five_points end,
			week_points = case when week_start is not distinct from $3 then greatest(week_points - $4, 0) else week_points end
		where user_id = $1`, userID, five, week, points); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *UsageStore) Overage(ctx context.Context, userID string, since time.Time) (bool, int, int, error) {
	var enabled bool
	var limit, used int
	err := s.pool.QueryRow(ctx, `
		select coalesce((select overage_enabled from public.usage_state where user_id = $1), false),
		       coalesce((select overage_cap from public.usage_state where user_id = $1), 0),
		       coalesce((select sum(credits) from public.usage_events where user_id = $1 and overage and created_at >= $2), 0)`, userID, since).
		Scan(&enabled, &limit, &used)
	return enabled, limit, used, err
}

func (s *UsageStore) SetOverage(ctx context.Context, userID string, enabled bool, limit int) error {
	_, err := s.pool.Exec(ctx, `
		insert into public.usage_state (user_id, overage_enabled, overage_cap) values ($1, $2, $3)
		on conflict (user_id) do update set overage_enabled = excluded.overage_enabled, overage_cap = excluded.overage_cap`, userID, enabled, limit)
	return err
}

func (s *UsageStore) MarkLimitNotified(ctx context.Context, userID string, resetsAt time.Time) (bool, error) {
	tag, err := s.pool.Exec(ctx, `update public.usage_state set limit_notified_for = $2 where user_id = $1 and limit_notified_for is distinct from $2`, userID, resetsAt)
	return tag.RowsAffected() == 1, err
}

func (s *UsageStore) Snapshot(ctx context.Context, userID string, limits credits.Limits, now time.Time) (credits.Snapshot, error) {
	plan, err := s.Plan(ctx, userID)
	if err != nil {
		return credits.Snapshot{}, err
	}
	var st state
	if err := s.pool.QueryRow(ctx, `select five_start, five_points, week_start, week_points from public.usage_state where user_id = $1`, userID).
		Scan(&st.fiveStart, &st.fivePoints, &st.weekStart, &st.weekPoints); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return credits.Snapshot{}, err
	}
	st = st.current(now)
	enabled, cap, used, err := s.Overage(ctx, userID, time.Date(now.UTC().Year(), now.UTC().Month(), 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		return credits.Snapshot{}, err
	}
	snap := credits.Snapshot{
		Plan: plan, FiveUsed: st.fivePoints, FiveLimit: limits.FiveHour, WeekUsed: st.weekPoints, WeekLimit: limits.Week,
		WeekResetsAt: st.weekStart.AddDate(0, 0, 7), OverageEnabled: enabled, OverageCap: cap, OverageUsed: used,
	}
	if st.fiveStart != nil {
		reset := st.fiveStart.Add(fiveHours)
		snap.FiveResetsAt = &reset
	}
	return snap, nil
}
