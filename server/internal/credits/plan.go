package credits

import (
	"context"
	"errors"
	"fmt"
	"time"
)

type Plan string

const (
	PlanFree Plan = "free"
	PlanPro  Plan = "pro"
)

// Windows a usage limit can be reached in.
const (
	WindowFiveHour = "five_hour"
	WindowWeek     = "week"
)

// Setting keys for plans, all editable by an admin.
const (
	SettingFreeMultiplier    = "free_price_multiplier_pct"
	SettingLimitFiveHour     = "pro_limit_five_hour"
	SettingLimitWeek         = "pro_limit_week"
	SettingFreeAvatars       = "free_avatar_limit"
	SettingFreeSearchesDay   = "free_searches_per_day"
	SettingFreeSearchResults = "free_search_results"
	SettingProPriceCents     = "pro_price_cents"
	SettingOverageDefaultCap = "overage_default_cap"
	SettingStripeTax         = "stripe_tax_enabled"
)

// ErrLimitReached means a Pro user has used up a usage window.
var ErrLimitReached = errors.New("usage limit reached")

type LimitError struct {
	Window   string
	ResetsAt time.Time
}

func (e *LimitError) Error() string {
	return fmt.Sprintf("usage limit reached (%s), resets %s", e.Window, e.ResetsAt.Format(time.RFC3339))
}

func (e *LimitError) Is(target error) bool { return target == ErrLimitReached }

// Limits are the most points a Pro user may use in each window.
type Limits struct{ FiveHour, Week int }

type TakeResult struct {
	OK       bool
	Window   string
	ResetsAt time.Time
}

// UsageEvent records what one charge took.
type UsageEvent struct {
	JobID   string
	UserID  string
	Points  int
	Credits int
	MultPct int
	Overage bool
}

// Snapshot is what a user sees on the usage page.
type Snapshot struct {
	Plan           Plan       `json:"plan"`
	FiveUsed       int        `json:"five_hour_used"`
	FiveLimit      int        `json:"five_hour_limit"`
	FiveResetsAt   *time.Time `json:"five_hour_resets_at"`
	WeekUsed       int        `json:"week_used"`
	WeekLimit      int        `json:"week_limit"`
	WeekResetsAt   time.Time  `json:"week_resets_at"`
	OverageEnabled bool       `json:"overage_enabled"`
	OverageCap     int        `json:"overage_cap"`
	OverageUsed    int        `json:"overage_used"`
}

// UsageStore keeps plans and usage windows.
type UsageStore interface {
	Plan(ctx context.Context, userID string) (Plan, error)
	// Take adds points to both windows in one step, unless one is already full.
	// An action may overshoot the end of a window; nothing more starts after it.
	Take(ctx context.Context, userID, jobID string, points int, limits Limits, now time.Time) (TakeResult, error)
	// Record notes a charge made in credits.
	Record(ctx context.Context, ev UsageEvent) error
	Event(ctx context.Context, jobID string) (UsageEvent, bool, error)
	// Release gives points back from a charge, and removes them from the windows they were counted in.
	Release(ctx context.Context, jobID string, points int) error
	Overage(ctx context.Context, userID string, since time.Time) (enabled bool, limit, used int, err error)
	SetOverage(ctx context.Context, userID string, enabled bool, limit int) error
	Snapshot(ctx context.Context, userID string, limits Limits, now time.Time) (Snapshot, error)
	// MarkLimitNotified says whether this is the first time the window ending at
	// resetsAt has been reported, and remembers it.
	MarkLimitNotified(ctx context.Context, userID string, resetsAt time.Time) (bool, error)
}

// LimitNotifier tells a person their limit is full. It must not block or fail.
type LimitNotifier interface {
	LimitReached(userID, window string, resetsAt time.Time)
}

// WithLimitNotifier sends one email for each window a Pro member fills.
func (s *Service) WithLimitNotifier(n LimitNotifier) *Service {
	s.notify = n
	return s
}

// WithUsage turns on plans. Without it every user is charged credits at face value.
func (s *Service) WithUsage(u UsageStore) *Service {
	s.usage = u
	return s
}

func (s *Service) limits(ctx context.Context) Limits {
	five, _, _ := s.store.Setting(ctx, SettingLimitFiveHour)
	week, _, _ := s.store.Setting(ctx, SettingLimitWeek)
	return Limits{FiveHour: five, Week: week}
}

func (s *Service) multiplierPct(ctx context.Context) int {
	if m, ok, err := s.store.Setting(ctx, SettingFreeMultiplier); err == nil && ok && m > 0 {
		return m
	}
	return 100
}

// PlanOf says which plan a user is on.
func (s *Service) PlanOf(ctx context.Context, userID string) (Plan, error) {
	if s.usage == nil {
		return PlanFree, nil
	}
	return s.usage.Plan(ctx, userID)
}

// Usage describes a user's plan and where they stand in the limits.
func (s *Service) Usage(ctx context.Context, userID string) (Snapshot, error) {
	if s.usage == nil {
		return Snapshot{Plan: PlanFree}, nil
	}
	return s.usage.Snapshot(ctx, userID, s.limits(ctx), time.Now())
}

// SetOverage lets a Pro user keep going on credits once a limit is full.
func (s *Service) SetOverage(ctx context.Context, userID string, enabled bool, limit int) error {
	if s.usage == nil || limit < 0 {
		return ErrUnavailable
	}
	return s.usage.SetOverage(ctx, userID, enabled, limit)
}

func ceilPct(amount, pct int) int { return (amount*pct + 99) / 100 }

// reservePro counts an action against a Pro user's windows, or against their
// credits if they have turned overage on and a window is full.
func (s *Service) reservePro(ctx context.Context, userID, jobID string, amount int, reason string) error {
	taken, err := s.usage.Take(ctx, userID, jobID, amount, s.limits(ctx), time.Now())
	if err != nil || taken.OK {
		return err
	}
	enabled, limit, used, err := s.usage.Overage(ctx, userID, monthStart(time.Now()))
	if err != nil {
		return err
	}
	if enabled && used+amount <= limit {
		if err := s.reserveCredits(ctx, userID, jobID, amount, "overage: "+reason, 100, true); err == nil || !errors.Is(err, ErrInsufficient) {
			return err
		}
	}
	if s.notify != nil {
		if first, err := s.usage.MarkLimitNotified(ctx, userID, taken.ResetsAt); err == nil && first {
			s.notify.LimitReached(userID, taken.Window, taken.ResetsAt)
		}
	}
	return &LimitError{Window: taken.Window, ResetsAt: taken.ResetsAt}
}

func monthStart(t time.Time) time.Time {
	t = t.UTC()
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
}

func (s *Service) reserveCredits(ctx context.Context, userID, jobID string, amount int, reason string, multPct int, overage bool) error {
	if err := s.checkDailyLimit(ctx, userID, amount); err != nil {
		return err
	}
	_, _, err := s.store.Apply(ctx, Entry{
		UserID: userID, Kind: KindReserve, Amount: -amount, JobID: jobID, Key: "reserve:" + jobID, Reason: reason,
	})
	if err != nil || s.usage == nil {
		return err
	}
	return s.usage.Record(ctx, UsageEvent{JobID: jobID, UserID: userID, Credits: amount, MultPct: multPct, Overage: overage})
}

// PlanInfo is what the pricing page shows: the Pro price and what each plan allows.
type PlanInfo struct {
	ProPriceCents      int `json:"pro_price_cents"`
	FreeCredits        int `json:"free_credits"`
	FreeMultiplierPct  int `json:"free_price_multiplier_pct"`
	FreeAvatars        int `json:"free_avatars"`
	FreeSearchesPerDay int `json:"free_searches_per_day"`
	FreeSearchResults  int `json:"free_search_results"`
	ProFiveHourLimit   int `json:"pro_five_hour_limit"`
	ProWeekLimit       int `json:"pro_week_limit"`
}

// Info reads the plan settings an admin controls.
func (s *Service) Info(ctx context.Context) (PlanInfo, error) {
	read := func(key string, fallback int) int {
		if v, ok, err := s.store.Setting(ctx, key); err == nil && ok {
			return v
		}
		return fallback
	}
	return PlanInfo{
		ProPriceCents: read(SettingProPriceCents, 2000), FreeCredits: read(SettingSignupGrant, 0), FreeMultiplierPct: read(SettingFreeMultiplier, 100),
		FreeAvatars: read(SettingFreeAvatars, 1), FreeSearchesPerDay: read(SettingFreeSearchesDay, 3), FreeSearchResults: read(SettingFreeSearchResults, 10),
		ProFiveHourLimit: read(SettingLimitFiveHour, 40), ProWeekLimit: read(SettingLimitWeek, 120),
	}, nil
}

// TaxEnabled says whether Stripe should collect sales tax, an admin switch.
func (s *Service) TaxEnabled(ctx context.Context) bool {
	v, ok, err := s.store.Setting(ctx, SettingStripeTax)
	return err == nil && ok && v != 0
}

// ProPriceCents is what a month of Pro costs.
func (s *Service) ProPriceCents(ctx context.Context) int {
	info, _ := s.Info(ctx)
	return info.ProPriceCents
}
