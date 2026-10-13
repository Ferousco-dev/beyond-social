package database

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	pgInvalidTextRepresentation = "22P02"

	jobColumns = `id::text, user_id::text, job_type, status, coalesce(stage, ''), progress, input, result, error,
		retry_count, created_at, updated_at, started_at, completed_at,
		coalesce(provider_task_id, ''), coalesce(idempotency_key, ''), next_run_at`
)

// JobStore implements jobs.Repository. Every user-facing read filters on
// user_id in SQL, so ownership does not depend on the HTTP layer behaving.
type JobStore struct {
	pool *pgxpool.Pool
}

func NewJobStore(pool *pgxpool.Pool) *JobStore { return &JobStore{pool: pool} }

func (s *JobStore) Create(ctx context.Context, job jobs.Job) (jobs.Job, bool, error) {
	input, err := json.Marshal(job.Input)
	if err != nil {
		return jobs.Job{}, false, fmt.Errorf("%w: input is not valid JSON", jobs.ErrInvalidInput)
	}
	// A repeat of (user, idempotency key) matches the partial unique index and
	// inserts nothing; the original row is then read back.
	created, err := scanJob(s.pool.QueryRow(ctx, `
		insert into public.jobs (user_id, job_type, status, input, idempotency_key, next_run_at)
		values ($1, $2, $3, $4, nullif($5, ''), now())
		on conflict (user_id, idempotency_key) where idempotency_key is not null do nothing
		returning `+jobColumns, job.UserID, job.Type, string(job.Status), input, job.IdempotencyKey))
	if err == nil {
		return created, true, nil
	}
	if !errors.Is(err, jobs.ErrNotFound) || job.IdempotencyKey == "" {
		return jobs.Job{}, false, err
	}
	existing, err := scanJob(s.pool.QueryRow(ctx, `
		select `+jobColumns+` from public.jobs where user_id = $1 and idempotency_key = $2`, job.UserID, job.IdempotencyKey))
	return existing, false, err
}

func (s *JobStore) List(ctx context.Context, userID string, limit, offset int) ([]jobs.Job, error) {
	rows, err := s.pool.Query(ctx, `
		select `+jobColumns+`
		from public.jobs
		where user_id = $1
		order by created_at desc, id desc
		limit $2 offset $3`, userID, limit, offset)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	list := make([]jobs.Job, 0, limit)
	for rows.Next() {
		job, err := scanJob(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, job)
	}
	return list, mapError(rows.Err())
}

func (s *JobStore) Get(ctx context.Context, userID, jobID string) (jobs.Job, error) {
	return scanJob(s.pool.QueryRow(ctx, `
		select `+jobColumns+` from public.jobs where id = $1 and user_id = $2`, jobID, userID))
}

func (s *JobStore) ByProviderTask(ctx context.Context, taskID string) (jobs.Job, error) {
	return scanJob(s.pool.QueryRow(ctx, `
		select `+jobColumns+` from public.jobs where provider_task_id = $1`, taskID))
}

func (s *JobStore) CountActive(ctx context.Context, userID, jobType string) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx, `
		select count(*) from public.jobs
		where user_id = $1 and job_type = $2 and status in ('queued', 'running')`, userID, jobType).Scan(&n)
	return n, err
}

func scanJob(row pgx.Row) (jobs.Job, error) {
	var (
		job           jobs.Job
		status        string
		input, result []byte
		errorMessage  *string
	)
	err := row.Scan(&job.ID, &job.UserID, &job.Type, &status, &job.Stage, &job.Progress, &input, &result, &errorMessage,
		&job.RetryCount, &job.CreatedAt, &job.UpdatedAt, &job.StartedAt, &job.CompletedAt,
		&job.ProviderTaskID, &job.IdempotencyKey, &job.NextRunAt)
	if err != nil {
		return jobs.Job{}, mapError(err)
	}
	job.Status = jobs.Status(status)
	if errorMessage != nil {
		job.Error = *errorMessage
	}
	if err := json.Unmarshal(input, &job.Input); err != nil {
		return jobs.Job{}, fmt.Errorf("decode job input: %w", err)
	}
	if err := json.Unmarshal(result, &job.Result); err != nil {
		return jobs.Job{}, fmt.Errorf("decode job result: %w", err)
	}
	return job, nil
}

// mapError turns "no such row" and "not a UUID" into jobs.ErrNotFound, so a
// malformed ID looks the same as a missing or foreign one.
func mapError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return jobs.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == pgInvalidTextRepresentation {
		return jobs.ErrNotFound
	}
	return err
}
