package database

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/orchestrator"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	workflowColumns = `id::text, user_id::text, objective, status, plan, coalesce(plan_hash, ''),
		approved_at, context, coalesce(error, ''), coalesce(idempotency_key, ''), next_run_at,
		created_at, updated_at, started_at, completed_at`

	stepColumns = `id::text, step_id, tool, args, needs, status, attempts, output,
		coalesce(error, ''), started_at, completed_at`
)

// WorkflowStore persists orchestrator workflows. Every user-facing read
// filters on user_id in SQL, matching the jobs store posture.
type WorkflowStore struct {
	pool *pgxpool.Pool
}

func NewWorkflowStore(pool *pgxpool.Pool) *WorkflowStore { return &WorkflowStore{pool: pool} }

// Create persists a workflow and its steps atomically. A repeat of
// (user, idempotency key) inserts nothing and reads back the original row,
// so retried plan submissions never fork a workflow.
func (s *WorkflowStore) Create(ctx context.Context, userID, objective string, plan map[string]any, steps []orchestrator.StepRecord, idempotencyKey, status string) (orchestrator.Workflow, bool, error) {
	planJSON, err := json.Marshal(plan)
	if err != nil {
		return orchestrator.Workflow{}, false, fmt.Errorf("marshal workflow plan: %w", err)
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return orchestrator.Workflow{}, false, err
	}
	defer tx.Rollback(ctx)

	var id string
	err = tx.QueryRow(ctx, `
		insert into public.workflows (user_id, objective, status, plan, idempotency_key, next_run_at)
		values ($1, $2, $3, $4, nullif($5, ''), now())
		on conflict (user_id, idempotency_key) where idempotency_key is not null do nothing
		returning id::text`, userID, objective, status, planJSON, idempotencyKey).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			existing, err := s.getTx(ctx, tx, userID, idempotencyKey)
			return existing, false, err
		}
		return orchestrator.Workflow{}, false, err
	}
	for _, step := range steps {
		argsJSON, err := json.Marshal(step.Args)
		if err != nil {
			return orchestrator.Workflow{}, false, fmt.Errorf("marshal step args: %w", err)
		}
		if _, err := tx.Exec(ctx, `
			insert into public.workflow_steps (workflow_id, user_id, step_id, tool, args, needs)
			values ($1, $2, $3, $4, $5, $6)`, id, userID, step.StepID, step.Tool, argsJSON, step.Needs); err != nil {
			return orchestrator.Workflow{}, false, err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return orchestrator.Workflow{}, false, err
	}
	got, err := s.Get(ctx, userID, id)
	return got, true, err
}

func (s *WorkflowStore) getTx(ctx context.Context, tx pgx.Tx, userID, idempotencyKey string) (orchestrator.Workflow, error) {
	var id string
	if err := tx.QueryRow(ctx, `
		select id::text from public.workflows where user_id = $1 and idempotency_key = $2`, userID, idempotencyKey).Scan(&id); err != nil {
		return orchestrator.Workflow{}, err
	}
	return s.getInTx(ctx, tx, userID, id)
}

// Get reads one workflow and its steps. A foreign or malformed id reads as
// not found either way.
func (s *WorkflowStore) Get(ctx context.Context, userID, id string) (orchestrator.Workflow, error) {
	return s.getInTx(ctx, s.pool, userID, id)
}

type querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func (s *WorkflowStore) getInTx(ctx context.Context, q querier, userID, id string) (orchestrator.Workflow, error) {
	workflow, err := scanWorkflow(q.QueryRow(ctx, `
		select `+workflowColumns+` from public.workflows where id = $1 and user_id = $2`, id, userID))
	if err != nil {
		return orchestrator.Workflow{}, err
	}
	rows, err := q.Query(ctx, `
		select `+stepColumns+` from public.workflow_steps
		where workflow_id = $1 order by created_at, step_id`, workflow.ID)
	if err != nil {
		return orchestrator.Workflow{}, err
	}
	defer rows.Close()
	for rows.Next() {
		step, err := scanStep(rows)
		if err != nil {
			return orchestrator.Workflow{}, err
		}
		workflow.Steps = append(workflow.Steps, step)
	}
	return workflow, rows.Err()
}

// List returns newest-first workflows for one user.
func (s *WorkflowStore) List(ctx context.Context, userID string, limit, offset int) ([]orchestrator.Workflow, error) {
	rows, err := s.pool.Query(ctx, `
		select `+workflowColumns+` from public.workflows
		where user_id = $1 order by created_at desc, id desc limit $2 offset $3`, userID, limit, offset)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	list := make([]orchestrator.Workflow, 0)
	for rows.Next() {
		workflow, err := scanWorkflow(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, workflow)
	}
	return list, rows.Err()
}

// Transition moves a workflow along the state machine. The update applies
// only from one of the expected states, so concurrent actors cannot both win.
func (s *WorkflowStore) Transition(ctx context.Context, userID, id string, from []orchestrator.WorkflowStatus, to orchestrator.WorkflowStatus, setPlanHash bool, planHash, errorMessage string) (orchestrator.Workflow, error) {
	fromStrings := make([]string, len(from))
	for i, status := range from {
		fromStrings[i] = string(status)
	}
	now := time.Now().UTC()
	workflow, err := scanWorkflow(s.pool.QueryRow(ctx, `
		update public.workflows
		set status = $1,
			plan_hash = case when $2 then $3 else plan_hash end,
			approved_at = case when $1 = 'approved' then $4 else approved_at end,
			started_at = case when $1 = 'running' and started_at is null then $4 else started_at end,
			completed_at = case when $1 in ('completed', 'failed', 'cancelled') then $4 else completed_at end,
			error = case when $5 <> '' then $5 else error end,
			next_run_at = case when $1 in ('completed', 'failed', 'cancelled') then null else now() end,
			updated_at = $4
		where id = $6 and user_id = $7 and status = any($8)
		returning `+workflowColumns, string(to), setPlanHash, planHash, now, errorMessage, id, userID, fromStrings))
	if err != nil {
		return orchestrator.Workflow{}, mapError(err)
	}
	return s.withSteps(ctx, workflow)
}

// UpdateStep records a step transition, output, or error.
func (s *WorkflowStore) UpdateStep(ctx context.Context, workflowID, stepID string, status orchestrator.StepStatus, output map[string]any, errorMessage string) error {
	outputJSON, err := json.Marshal(output)
	if err != nil {
		return fmt.Errorf("marshal step output: %w", err)
	}
	now := time.Now().UTC()
	_, err = s.pool.Exec(ctx, `
		update public.workflow_steps
		set status = $1,
			output = case when $2 <> '{}'::jsonb then $2 else output end,
			error = case when $3 <> '' then $3 else error end,
			attempts = case when $1 = 'running' then attempts + 1 else attempts end,
			started_at = case when $1 = 'running' and started_at is null then $4 else started_at end,
			completed_at = case when $1 in ('completed', 'failed', 'skipped') then $4 else completed_at end,
			updated_at = $4
		where workflow_id = $5 and step_id = $6`, string(status), outputJSON, errorMessage, now, workflowID, stepID)
	return err
}

// CountActive counts workflows that can still spend: approved, running, or
// waiting on the user. Used to cap concurrent workflows per user.
func (s *WorkflowStore) CountActive(ctx context.Context, userID string) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx, `
		select count(*) from public.workflows
		where user_id = $1 and status in ('approved', 'running', 'awaiting_approval', 'awaiting_clarification')`, userID).Scan(&n)
	return n, err
}

// SkipPending abandons every pending step, used on cancellation and failure.
func (s *WorkflowStore) SkipPending(ctx context.Context, workflowID string) error {
	_, err := s.pool.Exec(ctx, `
		update public.workflow_steps set status = 'skipped', updated_at = now()
		where workflow_id = $1 and status = 'pending'`, workflowID)
	return err
}

// Claim leases due workflows for the engine pool. Rows in approved or running
// state with an elapsed lease are picked with SKIP LOCKED.
func (s *WorkflowStore) Claim(ctx context.Context, limit int, lease time.Duration) ([]orchestrator.Workflow, error) {
	rows, err := s.pool.Query(ctx, `
		update public.workflows set next_run_at = now() + make_interval(secs => $2), updated_at = now()
		where id in (
			select id from public.workflows
			where status in ('approved', 'running') and next_run_at is not null and next_run_at <= now()
			order by next_run_at limit $1
			for update skip locked
		)
		returning `+workflowColumns, limit, lease.Seconds())
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	claimed := make([]orchestrator.Workflow, 0, limit)
	for rows.Next() {
		workflow, err := scanWorkflow(rows)
		if err != nil {
			return nil, err
		}
		workflow, err = s.withSteps(ctx, workflow)
		if err != nil {
			return nil, err
		}
		claimed = append(claimed, workflow)
	}
	return claimed, rows.Err()
}

func (s *WorkflowStore) withSteps(ctx context.Context, workflow orchestrator.Workflow) (orchestrator.Workflow, error) {
	full, err := s.getInTx(ctx, s.pool, workflow.UserID, workflow.ID)
	if err != nil {
		return workflow, err
	}
	return full, nil
}

func scanWorkflow(row pgx.Row) (orchestrator.Workflow, error) {
	var (
		workflow    orchestrator.Workflow
		status      string
		planJSON    []byte
		contextJSON []byte
	)
	err := row.Scan(&workflow.ID, &workflow.UserID, &workflow.Objective, &status, &planJSON,
		&workflow.PlanHash, &workflow.ApprovedAt, &contextJSON, &workflow.Error,
		&workflow.IdempotencyKey, &workflow.NextRunAt,
		&workflow.CreatedAt, &workflow.UpdatedAt, &workflow.StartedAt, &workflow.CompletedAt)
	if err != nil {
		return orchestrator.Workflow{}, mapError(err)
	}
	workflow.Status = orchestrator.WorkflowStatus(status)
	if err := json.Unmarshal(planJSON, &workflow.Plan); err != nil {
		return orchestrator.Workflow{}, fmt.Errorf("decode workflow plan: %w", err)
	}
	if err := json.Unmarshal(contextJSON, &workflow.Context); err != nil {
		return orchestrator.Workflow{}, fmt.Errorf("decode workflow context: %w", err)
	}
	return workflow, nil
}

func scanStep(row pgx.Row) (orchestrator.Step, error) {
	var (
		step       orchestrator.Step
		status     string
		argsJSON   []byte
		outputJSON []byte
	)
	err := row.Scan(&step.ID, &step.StepID, &step.Tool, &argsJSON, &step.Needs, &status,
		&step.Attempts, &outputJSON, &step.Error, &step.StartedAt, &step.CompletedAt)
	if err != nil {
		return orchestrator.Step{}, mapError(err)
	}
	step.Status = orchestrator.StepStatus(status)
	if err := json.Unmarshal(argsJSON, &step.Args); err != nil {
		return orchestrator.Step{}, fmt.Errorf("decode step args: %w", err)
	}
	if err := json.Unmarshal(outputJSON, &step.Output); err != nil {
		return orchestrator.Step{}, fmt.Errorf("decode step output: %w", err)
	}
	return step, nil
}
