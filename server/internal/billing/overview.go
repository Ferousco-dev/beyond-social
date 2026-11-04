package billing

import (
	"context"
	"time"
)

// Subscriber is one person's membership as the admin sees it.
type Subscriber struct {
	Email     string  `json:"email"`
	Status    string  `json:"status"`
	PeriodEnd *string `json:"period_end,omitempty"`
	UpdatedAt string  `json:"updated_at"`
}

// Overview is the admin's view of money in and credits out over the last 30 days.
type Overview struct {
	ActiveSubscribers     int                    `json:"active_subscribers"`
	PastDueSubscribers    int                    `json:"past_due_subscribers"`
	CanceledSubscribers   int                    `json:"canceled_subscribers"`
	IncompleteSubscribers int                    `json:"incomplete_subscribers"`
	MonthlyRecurringCents int                    `json:"monthly_recurring_cents"`
	SubscriptionCents     int                    `json:"subscription_revenue_cents"`
	PackCents             int                    `json:"pack_revenue_cents"`
	PacksSold             int                    `json:"packs_sold"`
	CreditsSpent          int                    `json:"credits_spent"`
	UsagePoints           int                    `json:"usage_points"`
	Subscribers           []Subscriber           `json:"subscribers"`
	Activity              []SubscriptionActivity `json:"activity"`
}

type SubscriptionActivity struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	EventType    string    `json:"event_type"`
	Status       string    `json:"status"`
	PeriodEnd    *string   `json:"period_end,omitempty"`
	AmountCents  int       `json:"amount_cents"`
	Currency     string    `json:"currency"`
	AttemptCount int       `json:"attempt_count"`
	OccurredAt   time.Time `json:"occurred_at"`
}

// AdminReader reads the figures behind the overview.
type AdminReader interface {
	Overview(ctx context.Context, proPriceCents int) (Overview, error)
}

type RevenuePoint struct {
	Date              string `json:"date"`
	Currency          string `json:"currency"`
	SubscriptionCents int    `json:"subscriptionCents"`
	PackCents         int    `json:"packCents"`
	RefundCents       int    `json:"refundCents"`
}

type RevenueHistoryReader interface {
	RevenueHistory(ctx context.Context, days int) ([]RevenuePoint, error)
}
