package credits

import (
	"context"
	"errors"
	"math"
	"time"
)

// CreditValueUSD is what one credit is worth at the base price. Prices derive
// from it: credits = ceil(cost x (1 + margin) / CreditValueUSD).
const CreditValueUSD = 0.05

var ErrInvalid = errors.New("invalid credit request")

type PriceRow struct {
	Action    string    `json:"action"`
	Provider  string    `json:"provider"`
	Unit      string    `json:"unit"`
	CostUSD   float64   `json:"costUsd"`
	Margin    float64   `json:"margin"`
	Credits   int       `json:"credits"`
	Enabled   bool      `json:"enabled"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// PricePatch changes some fields of a price. Nil means leave unchanged. When the
// cost or margin changes and Credits is not given, credits are recomputed.
type PricePatch struct {
	CostUSD *float64 `json:"costUsd"`
	Margin  *float64 `json:"margin"`
	Credits *int     `json:"credits"`
	Enabled *bool    `json:"enabled"`
}

type Setting struct {
	Key       string    `json:"key"`
	Value     int       `json:"value"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type UserCredits struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Balance   int    `json:"balance"`
	Suspended bool   `json:"suspended"`
}

type UserDetail struct {
	ID                 string     `json:"id"`
	Email              string     `json:"email"`
	Name               string     `json:"name"`
	Phone              string     `json:"phone"`
	BusinessName       string     `json:"businessName"`
	Industry           string     `json:"industry"`
	Role               string     `json:"role"`
	AccountStatus      string     `json:"accountStatus"`
	CreatedAt          time.Time  `json:"createdAt"`
	Plan               string     `json:"plan"`
	SubscriptionStatus string     `json:"subscriptionStatus"`
	CurrentPeriodEnd   *time.Time `json:"currentPeriodEnd,omitempty"`
	CreditBalance      int        `json:"creditBalance"`
	FiveHourPoints     int        `json:"fiveHourPoints"`
	WeeklyPoints       int        `json:"weeklyPoints"`
}

type LedgerRow struct {
	Kind         Kind      `json:"kind"`
	Amount       int       `json:"amount"`
	BalanceAfter int       `json:"balanceAfter"`
	Reason       string    `json:"reason"`
	JobID        string    `json:"jobId,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// UsageRow is one action's charges over a period, set against what the provider
// is estimated to have cost us.
type UsageRow struct {
	Action     string  `json:"action"`
	Count      int     `json:"count"`
	Charged    int     `json:"credits"`
	RevenueUSD float64 `json:"revenueUsd"`
	CostUSD    float64 `json:"estimatedCostUsd"`
}

// ProviderSpend is what a provider account actually lost over a period, read
// from balance snapshots: the sum of every drop, ignoring top-ups.
type ProviderSpend struct {
	Provider string  `json:"provider"`
	Unit     string  `json:"unit"`
	Spent    float64 `json:"spent"`
}

// UsageReport sets what users were charged against what providers were paid.
type UsageReport struct {
	Actions   []UsageRow      `json:"actions"`
	Providers []ProviderSpend `json:"providers"`
}

// Segment narrows the user list. Everyone is either new, paid or active, and
// can be more than one.
type Segment string

const (
	SegmentAll    Segment = ""
	SegmentNew    Segment = "new"    // signed up in the last 7 days
	SegmentPaid   Segment = "paid"   // has bought credits
	SegmentActive Segment = "active" // spent credits in the last 30 days
)

func (s Segment) Valid() bool {
	return s == SegmentAll || s == SegmentNew || s == SegmentPaid || s == SegmentActive
}

// SegmentCounts is the head count behind each tab.
type SegmentCounts struct {
	Total  int `json:"total"`
	New    int `json:"new"`
	Paid   int `json:"paid"`
	Active int `json:"active"`
}

type AdminStore interface {
	SegmentCounts(ctx context.Context) (SegmentCounts, error)
	ProviderSpend(ctx context.Context, since time.Time) ([]ProviderSpend, error)
	Prices(ctx context.Context) ([]PriceRow, error)
	SavePrice(ctx context.Context, row PriceRow, actor string) error
	Settings(ctx context.Context) ([]Setting, error)
	SaveSetting(ctx context.Context, key string, value int, actor string) (bool, error)
	FindUsers(ctx context.Context, query string, segment Segment, limit int) ([]UserCredits, error)
	Ledger(ctx context.Context, userID string, limit int) ([]LedgerRow, error)
	Usage(ctx context.Context, since time.Time) ([]UsageRow, error)
}

// Admin is the admin-facing side of the credit system.
type Admin struct {
	store AdminStore
}

func NewAdmin(store AdminStore) *Admin { return &Admin{store: store} }

func (a *Admin) Prices(ctx context.Context) ([]PriceRow, error)  { return a.store.Prices(ctx) }
func (a *Admin) Settings(ctx context.Context) ([]Setting, error) { return a.store.Settings(ctx) }

func (a *Admin) FindUsers(ctx context.Context, query string, segment Segment, limit int) ([]UserCredits, error) {
	if !segment.Valid() {
		return nil, ErrInvalid
	}
	return a.store.FindUsers(ctx, query, segment, limit)
}

func (a *Admin) SegmentCounts(ctx context.Context) (SegmentCounts, error) {
	return a.store.SegmentCounts(ctx)
}

func (a *Admin) Ledger(ctx context.Context, userID string, limit int) ([]LedgerRow, error) {
	return a.store.Ledger(ctx, userID, limit)
}

func (a *Admin) Usage(ctx context.Context, days int) (UsageReport, error) {
	since := time.Now().AddDate(0, 0, -days)
	actions, err := a.store.Usage(ctx, since)
	if err != nil {
		return UsageReport{}, err
	}
	providers, err := a.store.ProviderSpend(ctx, since)
	return UsageReport{Actions: actions, Providers: providers}, err
}

func (a *Admin) UpdatePrice(ctx context.Context, action string, patch PricePatch, actor string) (PriceRow, error) {
	rows, err := a.store.Prices(ctx)
	if err != nil {
		return PriceRow{}, err
	}
	var row PriceRow
	found := false
	for _, r := range rows {
		if r.Action == action {
			row, found = r, true
		}
	}
	if !found {
		return PriceRow{}, ErrUnavailable
	}
	derive := false
	if patch.CostUSD != nil {
		row.CostUSD, derive = *patch.CostUSD, true
	}
	if patch.Margin != nil {
		row.Margin, derive = *patch.Margin, true
	}
	if patch.Enabled != nil {
		row.Enabled = *patch.Enabled
	}
	switch {
	case patch.Credits != nil:
		row.Credits = *patch.Credits
	case derive:
		row.Credits = int(math.Ceil(row.CostUSD * (1 + row.Margin) / CreditValueUSD))
	}
	if row.CostUSD < 0 || row.Margin < 0 || row.Credits < 0 {
		return PriceRow{}, ErrInvalid
	}
	return row, a.store.SavePrice(ctx, row, actor)
}

// SetSetting changes a tunable number. Unknown keys are refused so a typo
// cannot create a setting nothing reads.
func (a *Admin) SetSetting(ctx context.Context, key string, value int, actor string) error {
	if value < 0 {
		return ErrInvalid
	}
	ok, err := a.store.SaveSetting(ctx, key, value, actor)
	if err != nil {
		return err
	}
	if !ok {
		return ErrInvalid
	}
	return nil
}
