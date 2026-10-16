package database

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BillingStore implements billing.Store.
type BillingStore struct{ pool *pgxpool.Pool }

func NewBillingStore(pool *pgxpool.Pool) *BillingStore { return &BillingStore{pool: pool} }

const packColumns = `id::text, name, credits, price_cents, currency, enabled, sort`

func scanPack(row pgx.Row) (billing.Pack, error) {
	var p billing.Pack
	err := row.Scan(&p.ID, &p.Name, &p.Credits, &p.PriceCents, &p.Currency, &p.Enabled, &p.Sort)
	if errors.Is(err, pgx.ErrNoRows) || isInvalidText(err) {
		return p, billing.ErrNotFound
	}
	return p, err
}

func (s *BillingStore) Packs(ctx context.Context, enabledOnly bool) ([]billing.Pack, error) {
	rows, err := s.pool.Query(ctx, `select `+packColumns+` from public.credit_packs where enabled or not $1 order by sort, price_cents`, enabledOnly)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []billing.Pack{}
	for rows.Next() {
		p, err := scanPack(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *BillingStore) Pack(ctx context.Context, id string) (billing.Pack, error) {
	return scanPack(s.pool.QueryRow(ctx, `select `+packColumns+` from public.credit_packs where id = $1`, id))
}

func (s *BillingStore) SavePack(ctx context.Context, p billing.Pack, actor string) (billing.Pack, error) {
	if p.ID == "" {
		return scanPack(s.pool.QueryRow(ctx, `
			insert into public.credit_packs (name, credits, price_cents, currency, enabled, sort, updated_by)
			values ($1, $2, $3, $4, $5, $6, nullif($7, '')::uuid) returning `+packColumns,
			p.Name, p.Credits, p.PriceCents, p.Currency, p.Enabled, p.Sort, actor))
	}
	return scanPack(s.pool.QueryRow(ctx, `
		update public.credit_packs set name = $2, credits = $3, price_cents = $4, currency = $5, enabled = $6, sort = $7,
			updated_by = nullif($8, '')::uuid, updated_at = now()
		where id = $1 returning `+packColumns, p.ID, p.Name, p.Credits, p.PriceCents, p.Currency, p.Enabled, p.Sort, actor))
}

func (s *BillingStore) DeletePack(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `delete from public.credit_packs where id = $1`, id)
	if err != nil {
		if isInvalidText(err) {
			return billing.ErrNotFound
		}
		return err
	}
	if tag.RowsAffected() == 0 {
		return billing.ErrNotFound
	}
	return nil
}

const paymentColumns = `id::text, user_id::text, pack_name, credits, amount_cents, currency, status, credits_removed, created_at, paid_at`

func scanPayment(row pgx.Row) (billing.Payment, error) {
	var p billing.Payment
	err := row.Scan(&p.ID, &p.UserID, &p.PackName, &p.Credits, &p.AmountCents, &p.Currency, &p.Status, &p.CreditsRemoved, &p.CreatedAt, &p.PaidAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return p, billing.ErrNotFound
	}
	return p, err
}

func (s *BillingStore) CreatePayment(ctx context.Context, userID string, p billing.Pack) (billing.Payment, error) {
	return scanPayment(s.pool.QueryRow(ctx, `
		insert into public.payments (user_id, pack_id, pack_name, credits, amount_cents, currency)
		values ($1, $2, $3, $4, $5, $6) returning `+paymentColumns, userID, p.ID, p.Name, p.Credits, p.PriceCents, p.Currency))
}

func (s *BillingStore) AttachSession(ctx context.Context, paymentID, sessionID string) error {
	_, err := s.pool.Exec(ctx, `update public.payments set stripe_session_id = $2 where id = $1`, paymentID, sessionID)
	return err
}

func (s *BillingStore) PaymentBySession(ctx context.Context, sessionID string) (billing.Payment, error) {
	return scanPayment(s.pool.QueryRow(ctx, `select `+paymentColumns+` from public.payments where stripe_session_id = $1`, sessionID))
}

func (s *BillingStore) PaymentByIntent(ctx context.Context, intent string) (billing.Payment, error) {
	return scanPayment(s.pool.QueryRow(ctx, `select `+paymentColumns+` from public.payments where payment_intent = $1`, intent))
}

func (s *BillingStore) MarkPaid(ctx context.Context, paymentID, intent string) error {
	_, err := s.pool.Exec(ctx, `
		update public.payments
		set status = case when status = 'pending' then 'paid' else status end,
		    payment_intent = coalesce(nullif($2, ''), payment_intent),
		    paid_at = coalesce(paid_at, now())
		where id = $1`, paymentID, intent)
	return err
}

func (s *BillingStore) AddRemoved(ctx context.Context, paymentID string, credits int, fullyRefunded bool) error {
	_, err := s.pool.Exec(ctx, `
		update public.payments
		set credits_removed = credits_removed + $2, status = case when $3 then 'refunded' else status end
		where id = $1`, paymentID, credits, fullyRefunded)
	return err
}

func (s *BillingStore) UserPayments(ctx context.Context, userID string, limit int) ([]billing.Payment, error) {
	rows, err := s.pool.Query(ctx, `select `+paymentColumns+` from public.payments where user_id = $1 and status <> 'pending' order by created_at desc limit $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []billing.Payment{}
	for rows.Next() {
		p, err := scanPayment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *BillingStore) SaveSubscription(ctx context.Context, sub billing.Subscription) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var profileID string
	if err := tx.QueryRow(ctx, `select id::text from public.profiles where id = $1 for update`, sub.UserID).Scan(&profileID); err != nil {
		return err
	}
	var previous billing.Subscription
	err = tx.QueryRow(ctx, `select status, current_period_end from public.subscriptions where user_id = $1 for update`, sub.UserID).
		Scan(&previous.Status, &previous.PeriodEnd)
	exists := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	_, err = tx.Exec(ctx, `
		insert into public.subscriptions (user_id, status, stripe_customer, stripe_subscription, current_period_end)
		values ($1, $2, nullif($3, ''), nullif($4, ''), $5)
		on conflict (user_id) do update set
			status = excluded.status,
			stripe_customer = coalesce(excluded.stripe_customer, public.subscriptions.stripe_customer),
			stripe_subscription = coalesce(excluded.stripe_subscription, public.subscriptions.stripe_subscription),
			current_period_end = coalesce(excluded.current_period_end, public.subscriptions.current_period_end),
			updated_at = now()`, sub.UserID, sub.Status, sub.StripeCustomer, sub.StripeSubscription, sub.PeriodEnd)
	if err != nil {
		return err
	}

	eventType := ""
	switch {
	case !exists:
		eventType = "started"
	case previous.Status != sub.Status:
		eventType = "status_changed"
	case sub.PeriodEnd != nil && previous.PeriodEnd != nil && sub.PeriodEnd.After(*previous.PeriodEnd):
		eventType = "renewed"
	}
	if eventType != "" {
		periodEnd := sub.PeriodEnd
		if periodEnd == nil {
			periodEnd = previous.PeriodEnd
		}
		if _, err := tx.Exec(ctx, `
			insert into public.subscription_events (user_id, event_type, status, period_end)
			values ($1, $2, $3, $4)`, sub.UserID, eventType, sub.Status, periodEnd); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *BillingStore) SubscriptionOf(ctx context.Context, userID string) (billing.Subscription, error) {
	var sub billing.Subscription
	err := s.pool.QueryRow(ctx, `
		select user_id::text, status, coalesce(stripe_customer, ''), coalesce(stripe_subscription, ''), current_period_end
		from public.subscriptions where user_id = $1`, userID).
		Scan(&sub.UserID, &sub.Status, &sub.StripeCustomer, &sub.StripeSubscription, &sub.PeriodEnd)
	if errors.Is(err, pgx.ErrNoRows) {
		return sub, billing.ErrNotFound
	}
	return sub, err
}

func (s *BillingStore) UserOfSubscription(ctx context.Context, stripeSubscription string) (string, error) {
	var user string
	err := s.pool.QueryRow(ctx, `select user_id::text from public.subscriptions where stripe_subscription = $1`, stripeSubscription).Scan(&user)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", billing.ErrNotFound
	}
	return user, err
}

func (s *BillingStore) UserOfCustomer(ctx context.Context, stripeCustomer string) (string, error) {
	var user string
	err := s.pool.QueryRow(ctx, `select user_id::text from public.subscriptions where stripe_customer = $1`, stripeCustomer).Scan(&user)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", billing.ErrNotFound
	}
	return user, err
}

func (s *BillingStore) SaveInvoice(ctx context.Context, inv billing.Invoice) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	tag, err := tx.Exec(ctx, `
		insert into public.invoices (stripe_invoice, user_id, amount_cents, currency) values ($1, $2, $3, $4)
		on conflict (stripe_invoice) do nothing`, inv.ID, inv.UserID, inv.AmountCents, inv.Currency)
	if err != nil {
		return err
	}
	if tag.RowsAffected() > 0 {
		if _, err := tx.Exec(ctx, `
			insert into public.subscription_events (user_id, event_type, status, amount_cents, currency, invoice_id)
			values ($1, 'invoice_paid', 'paid', $2, lower($3), $4)
			on conflict (event_type, invoice_id, attempt_count) where invoice_id is not null do nothing`,
			inv.UserID, inv.AmountCents, inv.Currency, inv.ID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *BillingStore) RecordInvoiceFailure(ctx context.Context, inv billing.Invoice) error {
	_, err := s.pool.Exec(ctx, `
		insert into public.subscription_events (user_id, event_type, status, amount_cents, currency, invoice_id, attempt_count)
		values ($1, 'invoice_payment_failed', 'past_due', $2, lower($3), $4, $5)
		on conflict (event_type, invoice_id, attempt_count) where invoice_id is not null do nothing`,
		inv.UserID, inv.AmountCents, inv.Currency, inv.ID, inv.AttemptCount)
	return err
}
