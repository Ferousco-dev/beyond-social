package transform

import (
	"context"
	"errors"
	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// Provider is the part of the KIE client the processor uses.
type Provider interface {
	Upload(ctx context.Context, fileName, mimeType string, data []byte) (string, error)
	CreateTask(ctx context.Context, r kie.TaskRequest) (string, error)
	CreateModelTask(ctx context.Context, model string, input map[string]any, callbackURL string) (string, error)
	GetTask(ctx context.Context, taskID string) (kie.Task, error)
}

// Fetcher downloads untrusted media with size and address limits.
type Fetcher interface {
	Fetch(ctx context.Context, rawURL string, maxBytes int64) ([]byte, error)
}

// Stages, shown to the user as coarse progress.
const (
	stagePreparing  = "preparing"
	stageUploading  = "uploading"
	stageSubmitting = "submitting"
	stageGenerating = "generating"
	stageDone       = "done"
)

const (
	Lease          = 5 * time.Minute
	HandleTimeout  = 4*time.Minute + 30*time.Second
	maxJobAge      = 30 * time.Minute
	maxAttempts    = 3
	fastPoll       = 10 * time.Second
	slowPoll       = 20 * time.Second
	fastPollWindow = 2 * time.Minute

	msgTooLarge    = "That video is larger than the 10 MB limit for transformations."
	msgUnusable    = "That video could not be used. Try a different one."
	msgUnavailable = "The video service is unavailable right now. Please try again shortly."
	msgInterrupted = "The request was interrupted before it could be confirmed. Please try again."
	msgFailed      = "The video could not be generated. Try a different video or prompt."
	msgTimedOut    = "The video took too long to generate. Please try again."
)

// Prepared is a KIE task ready to submit: the model and its own input.
type Prepared struct {
	Model string
	Input map[string]any
}

// UserError is a problem a builder found that retrying cannot fix. Its message
// is shown to the user as the reason the job failed.
type UserError struct{ Message string }

func (e *UserError) Error() string { return e.Message }

// Builder prepares a job of some other type (uploading its inputs, composing
// its prompt) so this processor can submit it and follow it to completion.
type Builder func(ctx context.Context, job jobs.Job) (Prepared, error)

type Processor struct {
	// Builders handle job types other than a video transformation.
	Builders map[string]Builder
	// ResultKeys names where a job type's finished file is stored in its
	// result. Types not listed make videos, stored as video_url.
	ResultKeys  map[string]string
	Jobs        *jobs.Service
	Provider    Provider
	Fetcher     Fetcher
	Resolver    Resolver
	CallbackURL string // empty when no public URL is configured; polling still works
	Alerts      alerts.Reporter
	Now         func() time.Time
}

func (p *Processor) now() time.Time {
	if p.Now != nil {
		return p.Now()
	}
	return time.Now()
}

// Handle advances one claimed job by one step.
func (p *Processor) Handle(ctx context.Context, job jobs.Job) {
	switch {
	case p.now().Sub(job.CreatedAt) > maxJobAge:
		p.fail(ctx, job, msgTimedOut)
	case job.ProviderTaskID != "":
		p.poll(ctx, job)
	case job.Stage == stageSubmitting:
		// The previous worker died around the submit call. The task may or may
		// not exist at KIE, and submitting again could bill twice, so stop here.
		slog.Error("job interrupted while submitting", "job_id", job.ID)
		p.fail(ctx, job, msgInterrupted)
	default:
		p.submit(ctx, job)
	}
}

// Reconcile re-reads one task from KIE. Callbacks only name the task; the
// outcome always comes from KIE's API, so a forged or replayed callback cannot
// change a job. Unknown tasks and finished jobs are ignored.
func (p *Processor) Reconcile(ctx context.Context, taskID string) {
	job, err := p.Jobs.ByProviderTask(ctx, taskID)
	if err != nil || job.Status.Terminal() {
		return
	}
	p.poll(ctx, job)
}

func (p *Processor) result(jobType string, urls []string) map[string]any {
	if key, ok := p.ResultKeys[jobType]; ok {
		return map[string]any{key: urls[0]}
	}
	return map[string]any{"video_url": urls[0], "video_urls": urls}
}

func (p *Processor) poll(ctx context.Context, job jobs.Job) {
	task, err := p.Provider.GetTask(ctx, job.ProviderTaskID)
	if err != nil {
		if ctx.Err() != nil {
			return
		}
		slog.Warn("task lookup failed", "job_id", job.ID, "error", err)
		alerts.Report(ctx, p.Alerts, err, alerts.Context{Source: "video transform", UserID: job.UserID, Resource: job.ID})
		if provider.IsTransient(err) {
			p.reschedule(ctx, job, slowPoll)
			return
		}
		p.fail(ctx, job, msgFailed)
		return
	}
	switch task.State {
	case kie.StateSuccess:
		p.advance(ctx, job, jobs.Update{
			Status: jobs.StatusCompleted, Stage: ptr(stageDone), Progress: ptr(100),
			Result: p.result(job.Type, task.ResultURLs),
		})
	case kie.StateFailed:
		slog.Warn("generation failed at provider", "job_id", job.ID, "code", task.FailCode, "reason", task.FailMsg)
		p.fail(ctx, job, msgFailed)
	default:
		delay := slowPoll
		if p.now().Sub(job.CreatedAt) < fastPollWindow {
			delay = fastPoll
		}
		next := p.now().Add(delay)
		progress := max(job.Progress, 40+task.Progress*60/100)
		p.advance(ctx, job, jobs.Update{Progress: &progress, NextRun: &next})
	}
}

func (p *Processor) reschedule(ctx context.Context, job jobs.Job, after time.Duration) {
	next := p.now().Add(after)
	p.advance(ctx, job, jobs.Update{NextRun: &next})
}

func (p *Processor) fail(ctx context.Context, job jobs.Job, message string) {
	// Detached so the failure is recorded even while shutting down.
	saveCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	p.advance(saveCtx, job, jobs.Update{Status: jobs.StatusFailed, Error: message})
}

// advance applies an update and reports whether it took effect. A job that is
// already finished is not an error: it means another path got there first.
func (p *Processor) advance(ctx context.Context, job jobs.Job, u jobs.Update) bool {
	if _, err := p.Jobs.Advance(ctx, job.ID, u); err != nil {
		if !errors.Is(err, jobs.ErrInvalidTransition) && ctx.Err() == nil {
			slog.Error("advance job", "job_id", job.ID, "error", err)
		}
		return false
	}
	return true
}

func str(m map[string]any, key string) string {
	s, _ := m[key].(string)
	return s
}

func ptr[T any](v T) *T { return &v }
