package jobs

import (
	"context"
	"log/slog"

	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
)

// Repository persists jobs. Every method that takes a userID must only ever
// see or change rows owned by that user; a row owned by someone else is
// indistinguishable from a missing one and yields ErrNotFound.
type Repository interface {
	Create(ctx context.Context, job Job) (Job, error)
	List(ctx context.Context, userID string, limit, offset int) ([]Job, error)
	Get(ctx context.Context, userID, jobID string) (Job, error)
	Transition(ctx context.Context, userID, jobID string, change Change) (Job, error)
}

// Publisher fans events out to the owning user's live connections. It must
// never block: a slow or absent client cannot be allowed to stall job work.
type Publisher interface {
	Publish(userID string, event realtime.Event)
}

const (
	EventCreated = "job.created"
	EventUpdated = "job.updated"
)

type Service struct {
	repo      Repository
	publisher Publisher
}

func NewService(repo Repository, publisher Publisher) *Service {
	return &Service{repo: repo, publisher: publisher}
}

type Page struct {
	Jobs    []Job
	HasMore bool
}

func (s *Service) Create(ctx context.Context, userID, jobType string, input map[string]any) (Job, error) {
	job, err := NewJob(userID, jobType, input)
	if err != nil {
		return Job{}, err
	}
	created, err := s.repo.Create(ctx, job)
	if err != nil {
		return Job{}, err
	}
	s.publish(EventCreated, created)
	return created, nil
}

func (s *Service) Transition(ctx context.Context, userID, jobID string, change Change) (Job, error) {
	updated, err := s.repo.Transition(ctx, userID, jobID, change)
	if err != nil {
		return Job{}, err
	}
	s.publish(EventUpdated, updated)
	return updated, nil
}

func (s *Service) Get(ctx context.Context, userID, jobID string) (Job, error) {
	return s.repo.Get(ctx, userID, jobID)
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

func (s *Service) publish(eventType string, job Job) {
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
