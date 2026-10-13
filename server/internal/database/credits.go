package database

import (
	"context"
	"errors"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CreditStore implements credits.Store.
type CreditStore struct {
	pool *pgxpool.Pool
}

func NewCreditStore(pool *pgxpool.Pool) *CreditStore { return &CreditStore{pool: pool} }

func (s *CreditStore) Apply(ctx context.Context, e credits.Entry) (int, bool, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, false, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // rollback after commit is a no-op

	// One statement both makes sure the balance row exists and takes its lock,
	// so concurrent entries for one user queue here and two requests cannot
	// spend the same credits. The no-op update is what makes RETURNING work.
	var balance int
	if err := tx.QueryRow(ctx, `
		insert into public.credit_balances (user_id) values ($1)
		on conflict (user_id) do update set user_id = excluded.user_id
		returning balance`, e.UserID).Scan(&balance); err != nil {
		return 0, false, err
	}
	if balance+e.Amount < 0 {
		// A repeat of an entry that already took effect is not a shortfall.
		var done bool
		if err := tx.QueryRow(ctx, `select exists (select 1 from public.credit_ledger where idempotency_key = $1)`, e.Key).Scan(&done); err != nil {
			return 0, false, err
		}
		if done {
			return balance, false, nil
		}
		return balance, false, credits.ErrInsufficient
	}
	// The unique key is the duplicate check: it needs no query of its own, and
	// two requests racing on one key cannot both insert.
	tag, err := tx.Exec(ctx, `
		insert into public.credit_ledger (user_id, kind, amount, balance_after, job_id, idempotency_key, reason, actor_id)
		values ($1, $2, $3, $4, nullif($5, '')::uuid, $6, $7, nullif($8, '')::uuid)
		on conflict (idempotency_key) do nothing`,
		e.UserID, string(e.Kind), e.Amount, balance+e.Amount, e.JobID, e.Key, e.Reason, e.Actor)
	if err != nil {
		return 0, false, err
	}
	if tag.RowsAffected() == 0 {
		return balance, false, nil
	}
	balance += e.Amount
	if _, err := tx.Exec(ctx, `update public.credit_balances set balance = $2, updated_at = now() where user_id = $1`, e.UserID, balance); err != nil {
		return 0, false, err
	}
	return balance, true, tx.Commit(ctx)
}

func (s *CreditStore) Balance(ctx context.Context, userID string) (int, error) {
	var balance int
	err := s.pool.QueryRow(ctx, `select balance from public.credit_balances where user_id = $1`, userID).Scan(&balance)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return balance, err
}

func (s *CreditStore) Reserved(ctx context.Context, jobID string) (int, error) {
	var amount int
	err := s.pool.QueryRow(ctx, `select -amount from public.credit_ledger where idempotency_key = $1`, "reserve:"+jobID).Scan(&amount)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return amount, err
}

func (s *CreditStore) Price(ctx context.Context, action string) (credits.Price, bool, error) {
	p := credits.Price{Action: action}
	err := s.pool.QueryRow(ctx, `select credits, enabled from public.action_prices where action = $1`, action).Scan(&p.Credits, &p.Enabled)
	if errors.Is(err, pgx.ErrNoRows) {
		return credits.Price{}, false, nil
	}
	return p, err == nil, err
}

func (s *CreditStore) SpentSince(ctx context.Context, userID string, since time.Time) (int, error) {
	var spent int
	err := s.pool.QueryRow(ctx, `
		select coalesce(-sum(amount), 0)::int from public.credit_ledger
		where user_id = $1 and created_at >= $2 and kind in ('reserve', 'settle', 'refund')`, userID, since).Scan(&spent)
	return spent, err
}

func (s *CreditStore) Setting(ctx context.Context, key string) (int, bool, error) {
	var v int
	err := s.pool.QueryRow(ctx, `select value from public.credit_settings where key = $1`, key).Scan(&v)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, false, nil
	}
	return v, err == nil, err
}

// OpenJobs lists finished jobs that hold a reservation nobody closed.
func (s *CreditStore) OpenJobs(ctx context.Context, olderThan time.Duration, limit int) ([]jobs.Job, error) {
	rows, err := s.pool.Query(ctx, `
		select `+jobColumns+` from public.jobs j
		where status in ('completed', 'failed', 'ready')
		  and updated_at < now() - make_interval(secs => $1)
		  and exists (select 1 from public.credit_ledger where idempotency_key = 'reserve:' || j.id::text)
		  and not exists (select 1 from public.credit_ledger where idempotency_key = 'close:' || j.id::text)
		limit $2`, olderThan.Seconds(), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []jobs.Job{}
	for rows.Next() {
		job, err := scanJob(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, job)
	}
	return out, rows.Err()
}

// OpenSearches lists finished searches that hold a reservation nobody closed.
func (s *CreditStore) OpenSearches(ctx context.Context, olderThan time.Duration, limit int) ([]credits.OpenResource, error) {
	rows, err := s.pool.Query(ctx, `
		select d.id::text, d.user_id::text, d.status = 'completed' from public.discoveries d
		where d.status in ('completed', 'failed')
		  and d.updated_at < now() - make_interval(secs => $1)
		  and exists (select 1 from public.credit_ledger where idempotency_key = 'reserve:' || d.id::text)
		  and not exists (select 1 from public.credit_ledger where idempotency_key = 'close:' || d.id::text)
		limit $2`, olderThan.Seconds(), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []credits.OpenResource{}
	for rows.Next() {
		var d credits.OpenResource
		if err := rows.Scan(&d.ID, &d.UserID, &d.Delivered); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// OpenAvatars lists finished avatars that hold a reservation nobody closed.
func (s *CreditStore) OpenAvatars(ctx context.Context, olderThan time.Duration, limit int) ([]credits.OpenResource, error) {
	rows, err := s.pool.Query(ctx, `
		select a.id::text, a.user_id::text, a.training_status = 'ready' from public.avatars a
		where a.training_status in ('ready', 'failed')
		  and a.updated_at < now() - make_interval(secs => $1)
		  and exists (select 1 from public.credit_ledger where idempotency_key = 'reserve:' || a.id::text)
		  and not exists (select 1 from public.credit_ledger where idempotency_key = 'close:' || a.id::text)
		limit $2`, olderThan.Seconds(), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []credits.OpenResource{}
	for rows.Next() {
		var r credits.OpenResource
		if err := rows.Scan(&r.ID, &r.UserID, &r.Delivered); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *CreditStore) DailyUsage(ctx context.Context, userID, limitKey string, since time.Time) (int, int, bool, error) {
	var spent int
	var limit *int
	err := s.pool.QueryRow(ctx, `
		select coalesce((select -sum(amount) from public.credit_ledger
		                 where user_id = $1 and created_at >= $3 and kind in ('reserve', 'settle', 'refund')), 0)::int,
		       (select value from public.credit_settings where key = $2)`, userID, limitKey, since).Scan(&spent, &limit)
	if err != nil || limit == nil {
		return spent, 0, false, err
	}
	return spent, *limit, true, nil
}
