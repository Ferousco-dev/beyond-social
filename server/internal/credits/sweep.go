package credits

import (
	"context"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// OpenResource is a finished search or avatar whose charge was never closed.
type OpenResource struct {
	ID        string
	UserID    string
	Delivered bool
}

// OpenCharges finds finished work whose reservation was never settled or
// refunded, for example because the process stopped between the two.
type OpenCharges interface {
	OpenJobs(ctx context.Context, olderThan time.Duration, limit int) ([]jobs.Job, error)
	OpenSearches(ctx context.Context, olderThan time.Duration, limit int) ([]OpenResource, error)
	OpenAvatars(ctx context.Context, olderThan time.Duration, limit int) ([]OpenResource, error)
}

// Sweeper closes charges that were missed. Closing is idempotent, so running it
// alongside the normal path is safe.
type Sweeper struct {
	Open      OpenCharges
	Jobs      *JobBiller
	Searches  *ActionBiller
	Avatars   *ActionBiller
	Interval  time.Duration
	OlderThan time.Duration
}

const sweepBatch = 100

func (s *Sweeper) Run(ctx context.Context) {
	interval := s.Interval
	if interval <= 0 {
		interval = 5 * time.Minute
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		s.Once(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// Once closes one batch and returns how many charges it closed.
func (s *Sweeper) Once(ctx context.Context) int {
	age := s.OlderThan
	if age <= 0 {
		age = time.Minute
	}
	closed := 0
	openJobs, err := s.Open.OpenJobs(ctx, age, sweepBatch)
	if err != nil {
		slog.Error("find open job charges", "error", err)
	}
	for _, job := range openJobs {
		if err := s.Jobs.Finish(ctx, job); err != nil {
			slog.Error("close open job charge", "job_id", job.ID, "error", err)
			continue
		}
		closed++
	}
	closed += s.closeResources(ctx, "search", s.Open.OpenSearches, s.Searches, age)
	closed += s.closeResources(ctx, "avatar", s.Open.OpenAvatars, s.Avatars, age)
	if closed > 0 {
		slog.Warn("closed charges the normal path missed", "count", closed)
	}
	return closed
}

func (s *Sweeper) closeResources(ctx context.Context, what string, find func(context.Context, time.Duration, int) ([]OpenResource, error), biller *ActionBiller, age time.Duration) int {
	if biller == nil {
		return 0
	}
	open, err := find(ctx, age, sweepBatch)
	if err != nil {
		slog.Error("find open charges", "kind", what, "error", err)
		return 0
	}
	closed := 0
	for _, r := range open {
		if err := biller.Close(ctx, r.UserID, r.ID, r.Delivered); err != nil {
			slog.Error("close open charge", "kind", what, "id", r.ID, "error", err)
			continue
		}
		closed++
	}
	return closed
}
