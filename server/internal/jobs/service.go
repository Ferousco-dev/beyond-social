package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
)

// Repository persists jobs. Methods that take a userID only ever see or change
// rows owned by that user; a row owned by someone else is indistinguishable
// from a missing one and yields ErrNotFound. Methods without a userID are for
// the trusted worker, which acts on rows it has already claimed.
type Repository interface {
	// Create inserts the job. With an idempotency key, a repeat returns the
	// original job and created=false instead of inserting a duplicate.
	Create(ctx context.Context, job Job) (created Job, isNew bool, err error)
	List(ctx context.Context, userID string, limit, offset int) ([]Job, error)
	Get(ctx context.Context, userID, jobID string) (Job, error)
	CountActive(ctx context.Context, userID, jobType string) (int, error)

	// Claim leases up to limit due jobs of a type, pushing their next_run_at
	// out by lease so a crashed worker's jobs become due again on their own.
	Claim(ctx context.Context, jobType string, limit int, lease time.Duration) ([]Job, error)
	Advance(ctx context.Context, jobID string, update Update) (Job, error)
	ByProviderTask(ctx context.Context, taskID string) (Job, error)
}

const (
	EventUpdated = "job.updated"
	EventCreated = "job.created"
)

// Biller charges for jobs. Reserve runs before any provider is called; Finish
// runs once when a job reaches a final state. Both must be safe to repeat.
type Biller interface {
	Reserve(ctx context.Context, job Job) error
	Finish(ctx context.Context, job Job) error
}

// Observer is told once when a job reaches a final state, after its charge has
// been settled or refunded. It must be safe to repeat.
type Observer interface {
	JobFinished(ctx context.Context, job Job)
}

type Service struct {
	repo      Repository
	publisher realtime.Publisher
	biller    Biller
	observers []Observer
}

// WithObserver adds a listener for finished jobs.
func (s *Service) WithObserver(o Observer) *Service {
	s.observers = append(s.observers, o)
	return s
}

// WithBiller turns on charging. Without one every job is free.
func (s *Service) WithBiller(b Biller) *Service {
	s.biller = b
	return s
}

func NewService(repo Repository, publisher realtime.Publisher) *Service {
	return &Service{repo: repo, publisher: publisher}
}

type Page struct {
	Jobs    []Job
	HasMore bool
}

// Create returns the job and whether it is new. A repeated idempotency key
// yields the original job unchanged, without a second event.
func (s *Service) Create(ctx context.Context, userID, jobType string, input map[string]any, idempotencyKey string) (Job, bool, error) {
	job, err := NewJob(userID, jobType, input)
	if err != nil {
		return Job{}, false, err
	}
	job.IdempotencyKey = idempotencyKey
	created, isNew, err := s.repo.Create(ctx, job)
	if err != nil {
		return Job{}, false, err
	}
	if !isNew {
		return created, false, nil
	}
	if s.biller != nil {
		if err := s.biller.Reserve(ctx, created); err != nil {
			// Not charged, so close the job rather than leave it for a worker.
			if _, failErr := s.repo.Advance(ctx, created.ID, Update{Status: StatusFailed, Error: "not charged: " + err.Error()}); failErr != nil {
				slog.Error("close unfunded job", "job_id", created.ID, "error", failErr)
			}
			return Job{}, false, err
		}
	}
	s.Publish(EventCreated, created)
	return created, true, nil
}

// Advance applies a worker update and tells the owner about it.
func (s *Service) Advance(ctx context.Context, jobID string, update Update) (Job, error) {
	updated, err := s.repo.Advance(ctx, jobID, update)
	if err != nil {
		return Job{}, err
	}
	if s.biller != nil && updated.Status.Terminal() {
		// Finish is idempotent. A failure here is logged loudly rather than
		// returned, because the job itself has already reached its final state.
		if err := s.biller.Finish(ctx, updated); err != nil {
			slog.Error("close job charge", "job_id", updated.ID, "user_id", updated.UserID, "error", err)
		}
	}
	if updated.Status.Terminal() {
		for _, o := range s.observers {
			o.JobFinished(ctx, updated)
		}
	}
	s.Publish(EventUpdated, updated)
	return updated, nil
}

func (s *Service) Get(ctx context.Context, userID, jobID string) (Job, error) {
	return s.repo.Get(ctx, userID, jobID)
}

func (s *Service) CountActive(ctx context.Context, userID, jobType string) (int, error) {
	return s.repo.CountActive(ctx, userID, jobType)
}

func (s *Service) Claim(ctx context.Context, jobType string, limit int, lease time.Duration) ([]Job, error) {
	return s.repo.Claim(ctx, jobType, limit, lease)
}

func (s *Service) ByProviderTask(ctx context.Context, taskID string) (Job, error) {
	return s.repo.ByProviderTask(ctx, taskID)
}

// List reads one extra row to learn whether another page exists.
func (s *Service) List(ctx context.Context, userID string, limit, offset int) (Page, error) {
	rows, err := s.repo.List(ctx, userID, limit+1, offset)
	if err != nil {
		return Page{}, err
	}
	if len(rows) > limit {
		return Page{Jobs: rows[:limit], HasMore: true}, nil
	}
	return Page{Jobs: rows}, nil
}

// Publish pushes a job event to its owner. Safe to call without a publisher.
func (s *Service) Publish(eventType string, job Job) {
	if s.publisher == nil {
		return
	}
	event, err := realtime.NewEvent(eventType, job.ID, job)
	if err != nil {
		slog.Error("build job event", "job_id", job.ID, "error", err)
		return
	}
	s.publisher.Publish(job.UserID, event)
}
