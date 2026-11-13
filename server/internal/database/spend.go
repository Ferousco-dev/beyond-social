package database

import (
	"context"
	"sort"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SpendStore struct{ pool *pgxpool.Pool }

func NewSpendStore(pool *pgxpool.Pool) *SpendStore { return &SpendStore{pool: pool} }

func (s *SpendStore) UnitCost(ctx context.Context, action string) (string, float64, bool, error) {
	var provider string
	var cost float64
	err := s.pool.QueryRow(ctx, `select provider, cost_usd::float8 from public.action_prices where action = $1`, action).Scan(&provider, &cost)
	if err == pgx.ErrNoRows {
		return "", 0, false, nil
	}
	return provider, cost, err == nil, err
}

func (s *SpendStore) RecordSpend(ctx context.Context, sp credits.Spend) error {
	_, err := s.pool.Exec(ctx, `
		insert into public.provider_spend (job_id, user_id, provider, job_type, action, units, cost_usd)
		values ($1, nullif($2, '')::uuid, $3, $4, $5, $6, $7)
		on conflict (job_id) do nothing`,
		sp.JobID, sp.UserID, sp.Provider, sp.JobType, sp.Action, sp.Units, sp.CostUSD)
	return err
}

// Report totals the period's recorded spend and AI token use. Each list is
// bounded so the page stays small however busy the product is.
func (s *SpendStore) Report(ctx context.Context, days int) (credits.SpendReport, error) {
	since := time.Now().AddDate(0, 0, -days)
	rep := credits.SpendReport{Days: days, Providers: []credits.SpendTotal{}, Actions: []credits.ActionSpend{},
		Users: []credits.UserSpend{}, Daily: []credits.DailySpend{}, Models: []credits.ModelUsage{}}

	rows, err := s.pool.Query(ctx, `
		select provider, count(*)::int, coalesce(sum(cost_usd), 0)::float8
		from public.provider_spend where created_at >= $1 group by provider order by 3 desc`, since)
	if err != nil {
		return rep, err
	}
	for rows.Next() {
		var t credits.SpendTotal
		if err := rows.Scan(&t.Provider, &t.Jobs, &t.CostUSD); err != nil {
			rows.Close()
			return rep, err
		}
		rep.Providers = append(rep.Providers, t)
	}
	rows.Close()

	rows, err = s.pool.Query(ctx, `
		select provider, action, count(*)::int, sum(units)::int, sum(cost_usd)::float8
		from public.provider_spend where created_at >= $1 group by provider, action order by 5 desc limit 50`, since)
	if err != nil {
		return rep, err
	}
	for rows.Next() {
		var a credits.ActionSpend
		if err := rows.Scan(&a.Provider, &a.Action, &a.Jobs, &a.Units, &a.CostUSD); err != nil {
			rows.Close()
			return rep, err
		}
		rep.Actions = append(rep.Actions, a)
	}
	rows.Close()

	rows, err = s.pool.Query(ctx, `
		select p.email, count(*)::int, sum(s.cost_usd)::float8
		from public.provider_spend s join public.profiles p on p.id = s.user_id
		where s.created_at >= $1 group by p.email order by 3 desc limit 10`, since)
	if err != nil {
		return rep, err
	}
	for rows.Next() {
		var u credits.UserSpend
		if err := rows.Scan(&u.Email, &u.Jobs, &u.CostUSD); err != nil {
			rows.Close()
			return rep, err
		}
		rep.Users = append(rep.Users, u)
	}
	rows.Close()

	daily := map[string]*credits.DailySpend{}
	point := func(date string) *credits.DailySpend {
		if daily[date] == nil {
			daily[date] = &credits.DailySpend{Date: date}
		}
		return daily[date]
	}
	rows, err = s.pool.Query(ctx, `
		select to_char(created_at at time zone 'utc', 'YYYY-MM-DD'), sum(cost_usd)::float8
		from public.provider_spend where created_at >= $1 group by 1`, since)
	if err != nil {
		return rep, err
	}
	for rows.Next() {
		var date string
		var cost float64
		if err := rows.Scan(&date, &cost); err != nil {
			rows.Close()
			return rep, err
		}
		point(date).CostUSD = cost
	}
	rows.Close()
	rows, err = s.pool.Query(ctx, `
		select to_char(created_at at time zone 'utc', 'YYYY-MM-DD'), sum(total_tokens)::int
		from public.ai_usage where created_at >= $1 group by 1`, since)
	if err != nil {
		return rep, err
	}
	for rows.Next() {
		var date string
		var tokens int
		if err := rows.Scan(&date, &tokens); err != nil {
			rows.Close()
			return rep, err
		}
		point(date).Tokens = tokens
	}
	rows.Close()
	for _, p := range daily {
		rep.Daily = append(rep.Daily, *p)
	}
	sort.Slice(rep.Daily, func(i, j int) bool { return rep.Daily[i].Date < rep.Daily[j].Date })

	rows, err = s.pool.Query(ctx, `
		select provider, model, count(*)::int, sum(input_tokens)::int, sum(output_tokens)::int
		from public.ai_usage where created_at >= $1 group by provider, model order by 4 + 5 desc limit 20`, since)
	if err != nil {
		return rep, err
	}
	defer rows.Close()
	for rows.Next() {
		var m credits.ModelUsage
		if err := rows.Scan(&m.Provider, &m.Model, &m.Calls, &m.InputTokens, &m.OutputTokens); err != nil {
			return rep, err
		}
		rep.Models = append(rep.Models, m)
	}
	return rep, rows.Err()
}
