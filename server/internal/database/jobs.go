package database

import (
	"context"
	"encoding/json"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type JobStore struct {
	pool *pgxpool.Pool
}

func NewJobStore(pool *pgxpool.Pool) *JobStore {
	return &JobStore{pool: pool}
}

func (s *JobStore) ListJobs(ctx context.Context, userID string, limit, offset int) ([]jobs.Job, error) {
	if limit <= 0 {
		limit = 50
	}

	rows, err := s.pool.Query(ctx, `
		select id, user_id, job_type, status, input, result, error, retry_count, created_at, updated_at, started_at, completed_at
		from public.jobs
		where user_id = $1
		order by created_at desc
		limit $2 offset $3
	`, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]jobs.Job, 0)
	for rows.Next() {
		job, err := scanJob(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, job)
	}
	return result, rows.Err()
}

func (s *JobStore) GetJob(ctx context.Context, userID, jobID string) (jobs.Job, error) {
	row := s.pool.QueryRow(ctx, `
		select id, user_id, job_type, status, input, result, error, retry_count, created_at, updated_at, started_at, completed_at
		from public.jobs
		where id = $1 and user_id = $2
	`, jobID, userID)
	job, err := scanJobRow(row)
	if err != nil {
		return jobs.Job{}, err
	}
	return job, nil
}

func (s *JobStore) Create(ctx context.Context, job jobs.Job) error {
	if job.ID == "" {
		job.ID = jobIDFromUser(job.UserID)
	}
	if job.CreatedAt.IsZero() {
		job.CreatedAt = time.Now().UTC()
	}
	if job.UpdatedAt.IsZero() {
		job.UpdatedAt = job.CreatedAt
	}
	_, err := s.pool.Exec(ctx, `
		insert into public.jobs (id, user_id, job_type, status, input, result, error, retry_count, created_at, updated_at, started_at, completed_at)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`, job.ID, job.UserID, job.Type, string(job.Status), encodeJSON(job.Input), encodeJSON(job.Result), job.Error, job.RetryCount, job.CreatedAt, job.UpdatedAt, nilTime(job.StartedAt), nilTime(job.CompletedAt))
	return err
}

func (s *JobStore) Update(ctx context.Context, job jobs.Job) error {
	if job.UpdatedAt.IsZero() {
		job.UpdatedAt = time.Now().UTC()
	}
	_, err := s.pool.Exec(ctx, `
		update public.jobs
		set status = $1,
		    result = $2,
		    error = $3,
		    retry_count = $4,
		    updated_at = $5,
		    started_at = $6,
		    completed_at = $7
		where id = $8 and user_id = $9
	`, string(job.Status), encodeJSON(job.Result), job.Error, job.RetryCount, job.UpdatedAt, nilTime(job.StartedAt), nilTime(job.CompletedAt), job.ID, job.UserID)
	return err
}

func jobIDFromUser(prefix string) string {
	_ = prefix
	return uuid.NewString()
}

func encodeJSON(value map[string]any) []byte {
	if value == nil {
		return []byte(`{}`)
	}
	payload, err := json.Marshal(value)
	if err != nil {
		return []byte(`{}`)
	}
	return payload
}

func nilTime(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	return value
}

func scanJob(rows interface{ Scan(...any) error }) (jobs.Job, error) {
	var (
		id, userID, jobType, status, errorMessage string
		input, result                             []byte
		createdAt, updatedAt                      time.Time
		startedAt, completedAt                    *time.Time
		retryCount                                int
	)
	if err := rows.Scan(&id, &userID, &jobType, &status, &input, &result, &errorMessage, &retryCount, &createdAt, &updatedAt, &startedAt, &completedAt); err != nil {
		return jobs.Job{}, err
	}
	job := jobs.Job{
		ID:          id,
		UserID:      userID,
		Type:        jobType,
		Status:      jobs.Status(status),
		Error:       errorMessage,
		RetryCount:  retryCount,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
		StartedAt:   startedAt,
		CompletedAt: completedAt,
	}
	if len(input) > 0 {
		if err := json.Unmarshal(input, &job.Input); err != nil {
			return jobs.Job{}, err
		}
	}
	if len(result) > 0 {
		if err := json.Unmarshal(result, &job.Result); err != nil {
			return jobs.Job{}, err
		}
	}
	return job, nil
}

func scanJobRow(row interface{ Scan(...any) error }) (jobs.Job, error) {
	return scanJob(row)
}
