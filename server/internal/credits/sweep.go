package credits

import (
	"context"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// OpenSearch is a finished search whose charge was never closed.
type OpenSearch struct {
	ID        string
	UserID    string
	Delivered bool
}

// OpenCharges finds finished work whose reservation was never settled or
// refunded, for example because the process stopped between the two.
type OpenCharges interface {
	OpenJobs(ctx context.Context, olderThan time.Duration, limit int) ([]jobs.Job, error)
	OpenSearches(ctx context.Context, olderThan time.Duration, limit int) ([]OpenSearch, error)
}

// Sweeper closes charges that were missed. Closing is idempotent, so running it
// alongside the normal path is safe.
type Sweeper struct {
	Open      OpenCharges
	Jobs      *JobBiller
	Searches  *DiscoveryBiller
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
	searches, err := s.Open.OpenSearches(ctx, age, sweepBatch)
	if err != nil {
		slog.Error("find open search charges", "error", err)
	}
	for _, d := range searches {
		if err := s.Searches.Close(ctx, d.UserID, d.ID, d.Delivered); err != nil {
			slog.Error("close open search charge", "discovery_id", d.ID, "error", err)
			continue
		}
		closed++
	}
	if closed > 0 {
		slog.Warn("closed charges the normal path missed", "count", closed)
	}
	return closed
}
