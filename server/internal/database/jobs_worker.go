package database

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// Claim leases due jobs. SKIP LOCKED lets several instances claim without
// blocking each other, and the lease (a pushed-out next_run_at) means a job
// whose worker died simply becomes due again.
func (s *JobStore) Claim(ctx context.Context, jobType string, limit int, lease time.Duration) ([]jobs.Job, error) {
	rows, err := s.pool.Query(ctx, `
		with due as (
			select id as due_id from public.jobs
			where job_type = $1 and status in ('queued', 'running') and next_run_at <= now()
			order by next_run_at
			limit $2
			for update skip locked
		)
		update public.jobs
		set next_run_at = now() + make_interval(secs => $3)
		from due
		where id = due.due_id
		returning `+jobColumns, jobType, limit, lease.Seconds())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var claimed []jobs.Job
	for rows.Next() {
		job, err := scanJob(rows)
		if err != nil {
			return nil, err
		}
		claimed = append(claimed, job)
	}
	return claimed, rows.Err()
}

// Advance locks the row, checks the lifecycle rules against the status it
// actually holds, and applies the update in one short transaction. Terminal
// jobs reject further changes, which is what makes late or repeated provider
// callbacks harmless.
func (s *JobStore) Advance(ctx context.Context, jobID string, u jobs.Update) (jobs.Job, error) {
	var result []byte
	if u.Result != nil {
		encoded, err := json.Marshal(u.Result)
		if err != nil {
			return jobs.Job{}, fmt.Errorf("%w: result is not valid JSON", jobs.ErrInvalidInput)
		}
		result = encoded
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return jobs.Job{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var current string
	if err := tx.QueryRow(ctx, `select status from public.jobs where id = $1 for update`, jobID).Scan(&current); err != nil {
		return jobs.Job{}, mapError(err)
	}
	if jobs.Status(current).Terminal() {
		return jobs.Job{}, fmt.Errorf("%w: job is already %s", jobs.ErrInvalidTransition, current)
	}
	if u.Status != "" && u.Status != jobs.Status(current) {
		if err := jobs.ValidateTransition(jobs.Status(current), u.Status); err != nil {
			return jobs.Job{}, err
		}
	}

	updated, err := scanJob(tx.QueryRow(ctx, `
		update public.jobs
		set status = coalesce(nullif($2, ''), status),
		    stage = coalesce($3, stage),
		    progress = coalesce($4, progress),
		    provider_task_id = coalesce($5, provider_task_id),
		    result = coalesce($6::jsonb, result),
		    error = case when $7 <> '' then $7 else error end,
		    retry_count = retry_count + $8,
		    next_run_at = case when coalesce(nullif($2, ''), status) in ('completed', 'failed', 'ready')
		                       then null else coalesce($9, next_run_at) end,
		    started_at = case when coalesce(nullif($2, ''), status) = 'running' and started_at is null
		                      then now() else started_at end,
		    completed_at = case when coalesce(nullif($2, ''), status) in ('completed', 'failed', 'ready')
		                        then now() else completed_at end,
		    updated_at = now()
		where id = $1
		returning `+jobColumns,
		jobID, string(u.Status), u.Stage, u.Progress, u.ProviderTaskID, result, u.Error, u.RetryDelta, u.NextRun))
	if err != nil {
		return jobs.Job{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return jobs.Job{}, err
	}
	return updated, nil
}
