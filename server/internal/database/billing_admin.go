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
		  (select count(*) from public.subscriptions where status = 'canceled'),
		  (select count(*) from public.subscriptions where status = 'incomplete'),
		  coalesce((select sum(amount_cents) from public.invoices where paid_at >= $1), 0),
		  coalesce((select sum(amount_cents) from public.payments where status = 'paid' and paid_at >= $1), 0),
		  (select count(*) from public.payments where status in ('paid', 'refunded') and paid_at >= $1),
		  coalesce((select -sum(amount) from public.credit_ledger where kind in ('reserve', 'settle', 'refund') and created_at >= $1), 0),
		  coalesce((select sum(points) from public.usage_events where created_at >= $1), 0)`, since).
		Scan(&o.ActiveSubscribers, &o.PastDueSubscribers, &o.CanceledSubscribers, &o.IncompleteSubscribers,
			&o.SubscriptionCents, &o.PackCents, &o.PacksSold, &o.CreditsSpent, &o.UsagePoints)
	if err != nil {
		return o, err
	}
	o.MonthlyRecurringCents = o.ActiveSubscribers * proPriceCents

	rows, err := s.pool.Query(ctx, `
		select p.email, s.status, to_char(s.current_period_end, 'YYYY-MM-DD'), to_char(s.updated_at, 'YYYY-MM-DD')
		from public.subscriptions s join public.profiles p on p.id = s.user_id
		where s.status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')
		order by s.updated_at desc limit 100`)
	if err != nil {
		return o, err
	}
	defer rows.Close()
	o.Subscribers = []billing.Subscriber{}
	for rows.Next() {
		var sub billing.Subscriber
		if err := rows.Scan(&sub.Email, &sub.Status, &sub.PeriodEnd, &sub.UpdatedAt); err != nil {
			return o, err
		}
		o.Subscribers = append(o.Subscribers, sub)
	}
	if err := rows.Err(); err != nil {
		return o, err
	}
	rows.Close()

	activityRows, err := s.pool.Query(ctx, `
		select e.id, p.email, e.event_type, e.status, to_char(e.period_end, 'YYYY-MM-DD'),
		       e.amount_cents, e.currency, e.attempt_count, e.occurred_at
		from public.subscription_events e join public.profiles p on p.id = e.user_id
		order by e.occurred_at desc, e.id desc limit 100`)
	if err != nil {
		return o, err
	}
	defer activityRows.Close()
	o.Activity = []billing.SubscriptionActivity{}
	for activityRows.Next() {
		var activity billing.SubscriptionActivity
		if err := activityRows.Scan(&activity.ID, &activity.Email, &activity.EventType, &activity.Status,
			&activity.PeriodEnd, &activity.AmountCents, &activity.Currency, &activity.AttemptCount, &activity.OccurredAt); err != nil {
			return o, err
		}
		o.Activity = append(o.Activity, activity)
	}
	return o, activityRows.Err()
}

func (s *BillingStore) RevenueHistory(ctx context.Context, days int) ([]billing.RevenuePoint, error) {
	since := time.Now().AddDate(0, 0, -(days - 1))
	rows, err := s.pool.Query(ctx, `
		with currencies as (
			select lower(currency) as currency from public.invoices where paid_at >= $1
			union
			select lower(currency) from public.payments where paid_at >= $1 and status in ('paid', 'refunded')
		), days as (
			select generate_series(date_trunc('day', $1::timestamptz), date_trunc('day', now()), interval '1 day')::date as day
		), daily as (
			select paid_at::date as day, lower(currency) as currency,
			       sum(amount_cents)::int as subscriptions, 0::int as packs, 0::int as refunds
			from public.invoices where paid_at >= $1 group by paid_at::date, lower(currency)
			union all
			select paid_at::date, lower(currency), 0::int,
			       sum(amount_cents) filter (where status = 'paid')::int,
			       sum(amount_cents) filter (where status = 'refunded')::int
			from public.payments where paid_at >= $1 and status in ('paid', 'refunded')
			group by paid_at::date, lower(currency)
		)
		select d.day::text, c.currency,
		       coalesce(sum(r.subscriptions), 0)::int,
		       coalesce(sum(r.packs), 0)::int,
		       coalesce(sum(r.refunds), 0)::int
		from days d cross join currencies c
		left join daily r on r.day = d.day and r.currency = c.currency
		group by d.day, c.currency order by d.day, c.currency`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	points := []billing.RevenuePoint{}
	for rows.Next() {
		var point billing.RevenuePoint
		if err := rows.Scan(&point.Date, &point.Currency, &point.SubscriptionCents, &point.PackCents, &point.RefundCents); err != nil {
			return nil, err
		}
		points = append(points, point)
	}
	return points, rows.Err()
}
