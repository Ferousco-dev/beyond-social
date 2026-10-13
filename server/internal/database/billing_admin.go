package database

import (
	"context"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
)

// Overview reads what the admin needs to see how the business is doing. Money is
// counted from payments and invoices this app recorded; Stripe stays the book of record.
func (s *BillingStore) Overview(ctx context.Context, proPriceCents int) (billing.Overview, error) {
	var o billing.Overview
	since := time.Now().AddDate(0, 0, -30)
	err := s.pool.QueryRow(ctx, `
		select
		  (select count(*) from public.subscriptions where status in ('active', 'trialing')),
		  (select count(*) from public.subscriptions where status = 'past_due'),
		  coalesce((select sum(amount_cents) from public.invoices where paid_at >= $1), 0),
		  coalesce((select sum(amount_cents) from public.payments where status = 'paid' and paid_at >= $1), 0),
		  (select count(*) from public.payments where status in ('paid', 'refunded') and paid_at >= $1),
		  coalesce((select -sum(amount) from public.credit_ledger where kind in ('reserve', 'settle', 'refund') and created_at >= $1), 0),
		  coalesce((select sum(points) from public.usage_events where created_at >= $1), 0)`, since).
		Scan(&o.ActiveSubscribers, &o.PastDueSubscribers, &o.SubscriptionCents, &o.PackCents, &o.PacksSold, &o.CreditsSpent, &o.UsagePoints)
	if err != nil {
		return o, err
	}
	o.MonthlyRecurringCents = o.ActiveSubscribers * proPriceCents

	rows, err := s.pool.Query(ctx, `
		select p.email, s.status, to_char(s.current_period_end, 'YYYY-MM-DD')
		from public.subscriptions s join public.profiles p on p.id = s.user_id
		where s.status in ('active', 'trialing', 'past_due')
		order by s.updated_at desc limit 100`)
	if err != nil {
		return o, err
	}
	defer rows.Close()
	o.Subscribers = []billing.Subscriber{}
	for rows.Next() {
		var sub billing.Subscriber
		if err := rows.Scan(&sub.Email, &sub.Status, &sub.PeriodEnd); err != nil {
			return o, err
		}
		o.Subscribers = append(o.Subscribers, sub)
	}
	return o, rows.Err()
}
