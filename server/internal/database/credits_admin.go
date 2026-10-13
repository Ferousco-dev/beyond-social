package database

import (
	"context"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
)

// AdminCreditStore implements credits.AdminStore.
type AdminCreditStore struct{ *CreditStore }

func NewAdminCreditStore(s *CreditStore) *AdminCreditStore { return &AdminCreditStore{s} }

func (s *AdminCreditStore) Prices(ctx context.Context) ([]credits.PriceRow, error) {
	rows, err := s.pool.Query(ctx, `
		select action, provider, unit, cost_usd::float8, margin::float8, credits, enabled, updated_at
		from public.action_prices order by action`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []credits.PriceRow{}
	for rows.Next() {
		var r credits.PriceRow
		if err := rows.Scan(&r.Action, &r.Provider, &r.Unit, &r.CostUSD, &r.Margin, &r.Credits, &r.Enabled, &r.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *AdminCreditStore) SavePrice(ctx context.Context, r credits.PriceRow, actor string) error {
	_, err := s.pool.Exec(ctx, `
		update public.action_prices set cost_usd = $2, margin = $3, credits = $4, enabled = $5,
			updated_by = nullif($6, '')::uuid, updated_at = now()
		where action = $1`, r.Action, r.CostUSD, r.Margin, r.Credits, r.Enabled, actor)
	return err
}

func (s *AdminCreditStore) Settings(ctx context.Context) ([]credits.Setting, error) {
	rows, err := s.pool.Query(ctx, `select key, value, updated_at from public.credit_settings order by key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []credits.Setting{}
	for rows.Next() {
		var v credits.Setting
		if err := rows.Scan(&v.Key, &v.Value, &v.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (s *AdminCreditStore) SaveSetting(ctx context.Context, key string, value int, actor string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `
		update public.credit_settings set value = $2, updated_by = nullif($3, '')::uuid, updated_at = now()
		where key = $1`, key, value, actor)
	return tag.RowsAffected() == 1, err
}

func (s *AdminCreditStore) FindUsers(ctx context.Context, query string, segment credits.Segment, limit int) ([]credits.UserCredits, error) {
	rows, err := s.pool.Query(ctx, `
		select p.id::text, p.email, p.display_name, coalesce(b.balance, 0)
		from public.profiles p left join public.credit_balances b on b.user_id = p.id
		where (p.email ilike '%' || $1 || '%' or p.display_name ilike '%' || $1 || '%' or p.id::text = $1)
		  and p.deleted_at is null
		  and case $2
		        when 'new' then p.created_at >= now() - interval '7 days'
		        when 'paid' then exists (select 1 from public.credit_ledger l where l.user_id = p.id and l.kind = 'purchase')
		        when 'active' then exists (select 1 from public.credit_ledger l where l.user_id = p.id and l.kind = 'reserve' and l.created_at >= now() - interval '30 days')
		        else true end
		order by p.created_at desc limit $3`, query, string(segment), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []credits.UserCredits{}
	for rows.Next() {
		var u credits.UserCredits
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Balance); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (s *AdminCreditStore) Ledger(ctx context.Context, userID string, limit int) ([]credits.LedgerRow, error) {
	rows, err := s.pool.Query(ctx, `
		select kind, amount, balance_after, reason, coalesce(job_id::text, ''), created_at
		from public.credit_ledger where user_id = $1 order by id desc limit $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []credits.LedgerRow{}
	for rows.Next() {
		var r credits.LedgerRow
		var kind string
		if err := rows.Scan(&kind, &r.Amount, &r.BalanceAfter, &r.Reason, &r.JobID, &r.CreatedAt); err != nil {
			return nil, err
		}
		r.Kind = credits.Kind(kind)
		out = append(out, r)
	}
	return out, rows.Err()
}

// Usage nets each reservation against what was handed back, so refunded work
// does not count as revenue. Cost is the action's estimated provider cost per
// credit charged, which is only an estimate until real provider bills are in.
func (s *AdminCreditStore) Usage(ctx context.Context, since time.Time) ([]credits.UsageRow, error) {
	rows, err := s.pool.Query(ctx, `
		select r.reason, count(*)::int, sum(-r.amount - coalesce(c.amount, 0))::int
		from public.credit_ledger r
		left join public.credit_ledger c on c.idempotency_key = 'close:' || r.job_id::text
		where r.kind = 'reserve' and r.created_at >= $1
		group by r.reason order by 3 desc`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []credits.UsageRow{}
	for rows.Next() {
		var u credits.UsageRow
		if err := rows.Scan(&u.Action, &u.Count, &u.Charged); err != nil {
			return nil, err
		}
		u.RevenueUSD = float64(u.Charged) * credits.CreditValueUSD
		out = append(out, u)
	}
	rows.Close()
	prices, err := s.Prices(ctx)
	if err != nil {
		return nil, err
	}
	for i := range out {
		for _, p := range prices {
			if p.Action == out[i].Action && p.Credits > 0 {
				out[i].CostUSD = float64(out[i].Charged) / float64(p.Credits) * p.CostUSD
			}
		}
	}
	return out, nil
}

// SaveSnapshot records what a provider account held right now.
func (s *CreditStore) SaveSnapshot(ctx context.Context, provider string, amount float64, unit string) error {
	_, err := s.pool.Exec(ctx, `insert into public.provider_balance_snapshots (provider, amount, unit) values ($1, $2, $3)`, provider, amount, unit)
	return err
}

// ProviderSpend adds up every drop between consecutive readings. A rise is a
// top-up, so it is ignored rather than netted against spending.
func (s *AdminCreditStore) ProviderSpend(ctx context.Context, since time.Time) ([]credits.ProviderSpend, error) {
	rows, err := s.pool.Query(ctx, `
		select provider, unit, coalesce(sum(prev - amount) filter (where prev > amount), 0)::float8
		from (
			select provider, unit, amount, taken_at,
			       lag(amount) over (partition by provider order by taken_at) as prev
			from public.provider_balance_snapshots
			where taken_at >= $1
		) s group by provider, unit order by provider`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []credits.ProviderSpend{}
	for rows.Next() {
		var p credits.ProviderSpend
		if err := rows.Scan(&p.Provider, &p.Unit, &p.Spent); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *AdminCreditStore) SegmentCounts(ctx context.Context) (credits.SegmentCounts, error) {
	var c credits.SegmentCounts
	err := s.pool.QueryRow(ctx, `
		select count(*)::int,
		       count(*) filter (where p.created_at >= now() - interval '7 days')::int,
		       count(*) filter (where exists (select 1 from public.credit_ledger l where l.user_id = p.id and l.kind = 'purchase'))::int,
		       count(*) filter (where exists (select 1 from public.credit_ledger l where l.user_id = p.id and l.kind = 'reserve' and l.created_at >= now() - interval '30 days'))::int
		from public.profiles p where p.deleted_at is null`).Scan(&c.Total, &c.New, &c.Paid, &c.Active)
	return c, err
}
