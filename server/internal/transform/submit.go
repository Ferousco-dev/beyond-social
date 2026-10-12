package transform

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

func (p *Processor) submit(ctx context.Context, job jobs.Job) {
	if !p.advance(ctx, job, jobs.Update{Status: jobs.StatusRunning, Stage: ptr(stagePreparing), Progress: ptr(5)}) {
		return
	}
	platform := video.Platform(str(job.Input, "platform"))
	fileURL, err := p.Resolver.Resolve(ctx, platform, str(job.Input, "source_url"))
	if err != nil {
		p.prepFailed(ctx, job, err)
		return
	}
	data, err := p.Fetcher.Fetch(ctx, fileURL, kie.MaxInputBytes)
	if err != nil {
		p.prepFailed(ctx, job, err)
		return
	}
	mimeType, err := safenet.SniffVideo(data)
	if err != nil {
		p.prepFailed(ctx, job, err)
		return
	}

	p.advance(ctx, job, jobs.Update{Stage: ptr(stageUploading), Progress: ptr(20)})
	uploaded, err := p.Provider.Upload(ctx, job.ID+extension(mimeType), mimeType, data)
	if err != nil {
		p.prepFailed(ctx, job, err)
		return
	}

	// Recorded before the call that spends money: if we die between here and the
	// task ID being saved, recovery sees stage=submitting and refuses to resubmit.
	if !p.advance(ctx, job, jobs.Update{Stage: ptr(stageSubmitting), Progress: ptr(30)}) {
		return
	}
	taskID, err := p.Provider.CreateTask(ctx, kie.TaskRequest{
		Prompt: str(job.Input, "prompt"), VideoURL: uploaded,
		Duration: str(job.Input, "duration"), Resolution: str(job.Input, "resolution"),
		CallbackURL: p.CallbackURL,
	})
	if err != nil {
		p.submitFailed(ctx, job, err)
		return
	}
	next := p.now().Add(fastPoll)
	if _, err := p.Jobs.Advance(ctx, job.ID, jobs.Update{ProviderTaskID: &taskID, Stage: ptr(stageGenerating), Progress: ptr(40), NextRun: &next}); err != nil {
		// The task exists at KIE but we could not record it. Log the ID so it can
		// be matched by hand; the job will be failed as interrupted on recovery.
		slog.Error("could not record provider task", "job_id", job.ID, "task_id", taskID, "error", err)
	}
}

// prepFailed handles errors before anything has been billed, so retrying is safe.
func (p *Processor) prepFailed(ctx context.Context, job jobs.Job, err error) {
	if ctx.Err() != nil {
		return
	}
	slog.Warn("preparing video failed", "job_id", job.ID, "attempt", job.RetryCount+1, "error", err)
	switch {
	case errors.Is(err, safenet.ErrTooLarge):
		p.fail(ctx, job, msgTooLarge)
	case errors.Is(err, safenet.ErrBadMediaType), errors.Is(err, safenet.ErrBlockedURL), errors.Is(err, ErrNoVideoFile):
		p.fail(ctx, job, msgUnusable)
	default:
		var pe *provider.Error
		if errors.As(err, &pe) && !pe.Transient {
			p.fail(ctx, job, msgUnavailable)
			return
		}
		p.retry(ctx, job)
	}
}

// submitFailed handles a failed createTask. Only a definite rejection from KIE
// may be retried; a connection error is ambiguous and could mean the task was created.
func (p *Processor) submitFailed(ctx context.Context, job jobs.Job, err error) {
	var pe *provider.Error
	slog.Warn("task submission failed", "job_id", job.ID, "error", err)
	switch {
	case !errors.As(err, &pe) || pe.Status == 0:
		p.fail(ctx, job, msgInterrupted)
	case pe.Transient:
		p.retry(ctx, job)
	default:
		p.fail(ctx, job, msgUnavailable)
	}
}

func (p *Processor) retry(ctx context.Context, job jobs.Job) {
	if job.RetryCount+1 >= maxAttempts {
		p.fail(ctx, job, msgUnavailable)
		return
	}
	next := p.now().Add(time.Duration(10<<job.RetryCount) * time.Second)
	p.advance(ctx, job, jobs.Update{Stage: ptr(stagePreparing), RetryDelta: 1, NextRun: &next})
}

func extension(mimeType string) string {
	switch mimeType {
	case "video/quicktime":
		return ".mov"
	case "video/x-matroska":
		return ".mkv"
	}
	return ".mp4"
}
