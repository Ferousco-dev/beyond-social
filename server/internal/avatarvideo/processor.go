package avatarvideo

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// Provider is the part of the HeyGen client used here.
type Provider interface {
	CreateVideo(ctx context.Context, r heygen.VideoRequest, idempotencyKey string) (string, error)
	GetVideo(ctx context.Context, videoID string) (heygen.Video, error)
}

const (
	Lease         = 2 * time.Minute
	HandleTimeout = time.Minute

	stageSubmitting = "submitting"
	stageGenerating = "generating"
	stageDone       = "done"

	maxJobAge   = 2 * time.Hour
	maxAttempts = 4
	fastPoll    = 10 * time.Second
	slowPoll    = 30 * time.Second
	fastWindow  = 3 * time.Minute

	msgFailed      = "The video could not be generated. Try again, or change the script."
	msgUnavailable = "Video generation is unavailable right now. Please try again shortly."
	msgTimedOut    = "The video took too long to generate. Please try again."
	msgAvatar      = "That avatar can no longer be used for videos."
)

type Processor struct {
	Jobs        *jobs.Service
	Avatars     AvatarLookup
	Provider    Provider
	CallbackURL string // empty when no public URL is configured; polling still works
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
	default:
		p.submit(ctx, job)
	}
}

// Reconcile re-reads one video from HeyGen. A callback only names the video;
// the outcome always comes from HeyGen's API, so a forged or replayed callback
// can change nothing. Unknown videos and finished jobs are ignored.
func (p *Processor) Reconcile(ctx context.Context, videoID string) {
	job, err := p.Jobs.ByProviderTask(ctx, videoID)
	if err != nil || job.Type != JobType || job.Status.Terminal() {
		return
	}
	p.poll(ctx, job)
}

func (p *Processor) submit(ctx context.Context, job jobs.Job) {
	userID := job.UserID
	avatar, err := p.Avatars.Get(ctx, userID, str(job.Input, "avatar_id"))
	if errors.Is(err, avatars.ErrNotFound) || (err == nil && (avatar.Status != avatars.StatusReady || avatar.LookID == "")) {
		p.fail(ctx, job, msgAvatar) // deleted or unusable since the job was queued
		return
	}
	if err != nil {
		p.retry(ctx, job)
		return
	}
	if !p.advance(ctx, job, jobs.Update{Status: jobs.StatusRunning, Stage: ptr(stageSubmitting), Progress: ptr(10)}) {
		return
	}

	// The job ID is the idempotency key: if a retry (or a restart) repeats this
	// call after HeyGen already accepted it, HeyGen returns the original video
	// instead of starting, and billing, a second one.
	videoID, err := p.Provider.CreateVideo(ctx, heygen.VideoRequest{
		AvatarID: avatar.LookID, VoiceID: str(job.Input, "voice_id"), Script: str(job.Input, "script"),
		Title: str(job.Input, "title"), CallbackURL: p.CallbackURL, CallbackID: job.ID,
	}, "job-"+job.ID)
	if err != nil {
		if ctx.Err() != nil {
			return
		}
		slog.Warn("video submission failed", "job_id", job.ID, "attempt", job.RetryCount+1, "error", err)
		if !provider.IsTransient(err) {
			p.fail(ctx, job, msgUnavailable)
			return
		}
		p.retry(ctx, job)
		return
	}
	next := p.now().Add(fastPoll)
	if _, err := p.Jobs.Advance(ctx, job.ID, jobs.Update{ProviderTaskID: &videoID, Stage: ptr(stageGenerating), Progress: ptr(25), NextRun: &next}); err != nil {
		slog.Error("could not record provider video", "job_id", job.ID, "video_id", videoID, "error", err)
	}
}

func (p *Processor) poll(ctx context.Context, job jobs.Job) {
	video, err := p.Provider.GetVideo(ctx, job.ProviderTaskID)
	if err != nil {
		if ctx.Err() != nil {
			return
		}
		slog.Warn("video lookup failed", "job_id", job.ID, "error", err)
		if provider.IsTransient(err) {
			p.reschedule(ctx, job, slowPoll)
			return
		}
		p.fail(ctx, job, msgFailed)
		return
	}
	switch video.Status {
	case heygen.VideoCompleted:
		if video.VideoURL == "" {
			// "Completed" without a usable file is not a success we can show.
			p.reschedule(ctx, job, slowPoll)
			return
		}
		p.advance(ctx, job, jobs.Update{
			Status: jobs.StatusCompleted, Stage: ptr(stageDone), Progress: ptr(100),
			Result: map[string]any{"video_url": video.VideoURL, "thumbnail_url": video.ThumbnailURL, "duration_seconds": video.DurationSecond},
		})
	case heygen.VideoFailed:
		slog.Warn("video failed at provider", "job_id", job.ID, "code", video.FailureCode)
		p.fail(ctx, job, failureMessage(video.FailureCode))
	default: // pending, processing, or a status this service does not know yet
		delay := slowPoll
		if p.now().Sub(job.CreatedAt) < fastWindow {
			delay = fastPoll
		}
		next := p.now().Add(delay)
		progress := max(job.Progress, 25)
		p.advance(ctx, job, jobs.Update{Progress: &progress, NextRun: &next})
	}
}

func (p *Processor) retry(ctx context.Context, job jobs.Job) {
	if job.RetryCount+1 >= maxAttempts {
		p.fail(ctx, job, msgUnavailable)
		return
	}
	next := p.now().Add(time.Duration(10<<job.RetryCount) * time.Second)
	p.advance(ctx, job, jobs.Update{RetryDelta: 1, NextRun: &next})
}

func (p *Processor) reschedule(ctx context.Context, job jobs.Job, after time.Duration) {
	next := p.now().Add(after)
	p.advance(ctx, job, jobs.Update{NextRun: &next})
}

func (p *Processor) fail(ctx context.Context, job jobs.Job, message string) {
	saveCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	p.advance(saveCtx, job, jobs.Update{Status: jobs.StatusFailed, Error: message})
}

// advance reports whether the update took effect. A finished job is not an
// error: it means another path got there first.
func (p *Processor) advance(ctx context.Context, job jobs.Job, u jobs.Update) bool {
	if _, err := p.Jobs.Advance(ctx, job.ID, u); err != nil {
		if !errors.Is(err, jobs.ErrInvalidTransition) && ctx.Err() == nil {
			slog.Error("advance job", "job_id", job.ID, "error", err)
		}
		return false
	}
	return true
}

// failureMessage never passes HeyGen's text through; it only recognises account
// problems, which the user cannot fix, so they get the "unavailable" wording.
func failureMessage(code string) string {
	c := strings.ToLower(code)
	if strings.Contains(c, "credit") || strings.Contains(c, "quota") || strings.Contains(c, "plan") {
		return msgUnavailable
	}
	return msgFailed
}

func str(m map[string]any, key string) string {
	s, _ := m[key].(string)
	return s
}

func ptr[T any](v T) *T { return &v }
