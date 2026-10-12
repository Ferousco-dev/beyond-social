package analysis

import (
	"context"
	"errors"
	"fmt"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// JobType is the type under which analyses are stored and claimed.
const JobType = "video_analysis"

const maxActivePerUser = 2

var ErrTooManyBusy = errors.New("too many analyses in progress")

// Jobs is the part of the job service analyses use.
type Jobs interface {
	Create(ctx context.Context, userID, jobType string, input map[string]any, idempotencyKey string) (jobs.Job, bool, error)
	CountActive(ctx context.Context, userID, jobType string) (int, error)
}

type Service struct {
	jobs Jobs
}

func NewService(j Jobs) *Service { return &Service{jobs: j} }

// Start queues an analysis of one linked video. conversationID, when set, is
// where the finished description is posted. Credits are held by the job service
// before anything runs, so a short balance fails here and nothing is queued.
func (s *Service) Start(ctx context.Context, userID string, link Link, conversationID, key string) (jobs.Job, bool, error) {
	active, err := s.jobs.CountActive(ctx, userID, JobType)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if active >= maxActivePerUser {
		return jobs.Job{}, false, ErrTooManyBusy
	}
	input := map[string]any{"url": link.URL, "kind": string(link.Kind)}
	if conversationID != "" {
		input["conversation_id"] = conversationID
	}
	job, isNew, err := s.jobs.Create(ctx, userID, JobType, input, key)
	if err != nil {
		return jobs.Job{}, false, fmt.Errorf("analysis: start: %w", err)
	}
	return job, isNew, nil
}

// StartMedia queues an analysis of a video the user uploaded. The file is
// looked up by id when the job runs, so only its owner's job can read it.
func (s *Service) StartMedia(ctx context.Context, userID, mediaID, conversationID, key string) (jobs.Job, bool, error) {
	active, err := s.jobs.CountActive(ctx, userID, JobType)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if active >= maxActivePerUser {
		return jobs.Job{}, false, ErrTooManyBusy
	}
	input := map[string]any{"media_id": mediaID, "kind": "upload"}
	if conversationID != "" {
		input["conversation_id"] = conversationID
	}
	job, isNew, err := s.jobs.Create(ctx, userID, JobType, input, key)
	if err != nil {
		return jobs.Job{}, false, fmt.Errorf("analysis: start: %w", err)
	}
	return job, isNew, nil
}
