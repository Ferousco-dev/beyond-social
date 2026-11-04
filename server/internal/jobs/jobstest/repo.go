// Package jobstest provides an in-memory jobs.Repository for tests. It follows
// the SQL store's contract: user-scoped reads, idempotent create, and finished
// jobs rejecting further updates.
package jobstest

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

type Repo struct {
	mu   sync.Mutex
	rows map[string]jobs.Job
	seq  int
}

func New() *Repo { return &Repo{rows: map[string]jobs.Job{}} }

func (r *Repo) Create(_ context.Context, j jobs.Job) (jobs.Job, bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if j.IdempotencyKey != "" {
		for _, e := range r.rows {
			if e.UserID == j.UserID && e.IdempotencyKey == j.IdempotencyKey {
				return e, false, nil
			}
		}
	}
	r.seq++
	j.ID = fmt.Sprintf("00000000-0000-4000-8000-%012d", r.seq)
	j.CreatedAt = time.Now()
	r.rows[j.ID] = j
	return j, true, nil
}

func (r *Repo) List(context.Context, string, int, int) ([]jobs.Job, error) { return nil, nil }

func (r *Repo) Get(_ context.Context, userID, id string) (jobs.Job, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if j, ok := r.rows[id]; ok && j.UserID == userID {
		return j, nil
	}
	return jobs.Job{}, jobs.ErrNotFound
}

func (r *Repo) CountActive(_ context.Context, userID, jobType string) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	n := 0
	for _, j := range r.rows {
		if j.UserID == userID && j.Type == jobType && !j.Status.Terminal() {
			n++
		}
	}
	return n, nil
}

func (r *Repo) Claim(context.Context, string, int, time.Duration) ([]jobs.Job, error) {
	return nil, nil
}

func (r *Repo) ByProviderTask(_ context.Context, taskID string) (jobs.Job, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, j := range r.rows {
		if j.ProviderTaskID == taskID {
			return j, nil
		}
	}
	return jobs.Job{}, jobs.ErrNotFound
}

func (r *Repo) Advance(_ context.Context, id string, u jobs.Update) (jobs.Job, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	j, ok := r.rows[id]
	if !ok {
		return jobs.Job{}, jobs.ErrNotFound
	}
	if j.Status.Terminal() {
		return jobs.Job{}, fmt.Errorf("%w: already %s", jobs.ErrInvalidTransition, j.Status)
	}
	if u.Status != "" && u.Status != j.Status {
		if err := jobs.ValidateTransition(j.Status, u.Status); err != nil {
			return jobs.Job{}, err
		}
		j.Status = u.Status
	}
	if u.Stage != nil {
		j.Stage = *u.Stage
	}
	if u.Progress != nil {
		j.Progress = *u.Progress
	}
	if u.ProviderTaskID != nil {
		j.ProviderTaskID = *u.ProviderTaskID
	}
	if u.Result != nil {
		j.Result = u.Result
	}
	if u.Error != "" {
		j.Error = u.Error
	}
	j.RetryCount += u.RetryDelta
	if j.Status.Terminal() {
		j.NextRunAt = nil
	} else if u.NextRun != nil {
		j.NextRunAt = u.NextRun
	}
	r.rows[id] = j
	return j, nil
}

// Job returns the stored job, for assertions.
func (r *Repo) Job(id string) jobs.Job {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.rows[id]
}

// Count returns how many jobs exist.
func (r *Repo) Count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.rows)
}
