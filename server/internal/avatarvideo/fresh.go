package avatarvideo

import (
	"context"
	"log/slog"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// Get returns one of the user's avatar videos. HeyGen's file URLs are presigned
// and expire, so a completed video's URL is refreshed from HeyGen on every read
// instead of trusting the one stored when it finished.
func (p *Processor) Get(ctx context.Context, userID, jobID string) (jobs.Job, error) {
	job, err := p.Jobs.Get(ctx, userID, jobID)
	if err != nil {
		return jobs.Job{}, err
	}
	if job.Type != JobType {
		return jobs.Job{}, jobs.ErrNotFound
	}
	if job.Status == jobs.StatusCompleted && job.ProviderTaskID != "" {
		video, err := p.Provider.GetVideo(ctx, job.ProviderTaskID)
		if err != nil || video.VideoURL == "" {
			slog.Warn("could not refresh video url; returning the stored one", "job_id", job.ID)
			return job, nil
		}
		job.Result = map[string]any{"video_url": video.VideoURL, "thumbnail_url": video.ThumbnailURL, "duration_seconds": video.DurationSecond}
	}
	return job, nil
}
