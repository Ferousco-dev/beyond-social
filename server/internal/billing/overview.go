package billing

import "context"

// Subscriber is one person's membership as the admin sees it.
type Subscriber struct {
	Email     string  `json:"email"`
	Status    string  `json:"status"`
	PeriodEnd *string `json:"period_end,omitempty"`
}

// Overview is the admin's view of money in and credits out over the last 30 days.
type Overview struct {
	ActiveSubscribers     int          `json:"active_subscribers"`
	PastDueSubscribers    int          `json:"past_due_subscribers"`
	MonthlyRecurringCents int          `json:"monthly_recurring_cents"`
	SubscriptionCents     int          `json:"subscription_revenue_cents"`
	PackCents             int          `json:"pack_revenue_cents"`
	PacksSold             int          `json:"packs_sold"`
	CreditsSpent          int          `json:"credits_spent"`
	UsagePoints           int          `json:"usage_points"`
	Subscribers           []Subscriber `json:"subscribers"`
}

// AdminReader reads the figures behind the overview.
type AdminReader interface {
	Overview(ctx context.Context, proPriceCents int) (Overview, error)
}
