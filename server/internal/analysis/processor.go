package analysis

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
	"google.golang.org/genai"
)

const (
	Lease         = 5 * time.Minute
	HandleTimeout = 4*time.Minute + 30*time.Second
	maxJobAge     = 20 * time.Minute
	maxAttempts   = 3

	// MaxInlineBytes is the most that travels in one Gemini request (the API
	// allows 20 MB in total, and the prompt takes a little). Short social clips
	// are well under it.
	MaxInlineBytes = 18 << 20

	stageFetching = "fetching"
	stageWatching = "watching"

	msgTooLarge    = "That video is too large to analyse. Try a shorter one."
	msgUnusable    = "I could not open that video. It may be private, removed, or not a normal video post."
	msgUnavailable = provider.UserMessage
	msgTimedOut    = "Watching the video took too long. Please try again."
)

// Watcher is the model call: it looks at media and answers in JSON.
type Watcher interface {
	GenerateJSONFromMedia(ctx context.Context, system, user string, media []gemini.Media, schema *genai.Schema) ([]byte, gemini.Usage, error)
}

// Resolver turns a TikTok or Instagram page into a fetchable video file URL.
type Resolver interface {
	Resolve(ctx context.Context, p video.Platform, pageURL string) (string, error)
}

// Uploads reads a user's own uploaded file, refusing anyone else's.
type Uploads interface {
	Load(ctx context.Context, userID, id string, max int64) ([]byte, string, error)
}

// Fetcher downloads untrusted media with size and address limits.
type Fetcher interface {
	Fetch(ctx context.Context, rawURL string, maxBytes int64) ([]byte, error)
}

type Processor struct {
	Jobs     *jobs.Service
	Watcher  Watcher
	Resolver Resolver
	Fetcher  Fetcher
	// Uploads reads a video the user uploaded. Optional.
	Uploads Uploads
	Alerts  alerts.Reporter
	Now     func() time.Time
}

func (p *Processor) now() time.Time {
	if p.Now != nil {
		return p.Now()
	}
	return time.Now()
}

// Handle runs one claimed analysis from start to finish. Nothing here is billed
// per attempt (the user's credits were held when the job was created), so a
// retry after a crash simply starts again.
func (p *Processor) Handle(ctx context.Context, job jobs.Job) {
	if p.now().Sub(job.CreatedAt) > maxJobAge {
		p.fail(ctx, job, msgTimedOut)
		return
	}
	if !p.advance(ctx, job, jobs.Update{Status: jobs.StatusRunning, Stage: ptr(stageFetching), Progress: ptr(10)}) {
		return
	}
	source := map[string]any{"kind": "upload"}
	var media gemini.Media
	var err error
	if mediaID := str(job.Input, "media_id"); mediaID != "" {
		media, err = p.loadUpload(ctx, job.UserID, mediaID)
	} else {
		link, ok := ParseLink(str(job.Input, "url"))
		if !ok {
			p.fail(ctx, job, msgUnusable)
			return
		}
		source = map[string]any{"kind": string(link.Kind), "url": link.URL}
		media, err = p.load(ctx, link)
	}
	if err != nil {
		p.failed(ctx, job, err)
		return
	}
	p.advance(ctx, job, jobs.Update{Stage: ptr(stageWatching), Progress: ptr(40)})

	data, _, err := p.Watcher.GenerateJSONFromMedia(ctx, system, "Analyse this video.", []gemini.Media{media}, schema())
	if err != nil {
		p.failed(ctx, job, err)
		return
	}
	result, err := Decode(data)
	if err != nil {
		slog.Warn("analysis reply rejected", "job_id", job.ID, "error", err)
		p.retry(ctx, job)
		return
	}
	p.advance(ctx, job, jobs.Update{
		Status: jobs.StatusCompleted, Progress: ptr(100),
		Result: map[string]any{"analysis": toMap(result), "source": source},
	})
}

// load returns something Gemini can watch. YouTube is handed over by link;
// TikTok and Instagram are fetched through Apify first.
func (p *Processor) load(ctx context.Context, link Link) (gemini.Media, error) {
	if link.Kind == KindYouTube {
		return gemini.Media{URI: link.URL}, nil
	}
	fileURL, err := p.Resolver.Resolve(ctx, video.Platform(link.Kind), link.URL)
	if err != nil {
		return gemini.Media{}, err
	}
	data, err := p.Fetcher.Fetch(ctx, fileURL, MaxInlineBytes)
	if err != nil {
		return gemini.Media{}, err
	}
	mime, err := safenet.SniffVideo(data)
	if err != nil {
		return gemini.Media{}, err
	}
	return gemini.Media{Data: data, MIME: mime}, nil
}

// failed decides between retrying and giving up, and tells an operator when the
// cause is credit or a key rather than this one video.
func (p *Processor) failed(ctx context.Context, job jobs.Job, err error) {
	if ctx.Err() != nil {
		return // shutting down: the lease expires and the job is picked up again
	}
	alerts.Report(ctx, p.Alerts, err, alerts.Context{Source: "video analysis", UserID: job.UserID, Resource: job.ID})
	slog.Warn("video analysis failed", "job_id", job.ID, "attempt", job.RetryCount+1, "error", err)
	var pe *provider.Error
	switch {
	case errors.Is(err, safenet.ErrTooLarge), errors.Is(err, media.ErrTooLarge):
		p.fail(ctx, job, msgTooLarge)
	case errors.Is(err, safenet.ErrBadMediaType), errors.Is(err, safenet.ErrBlockedURL), errors.Is(err, video.ErrNoVideoFile), errors.Is(err, media.ErrNotFound), errors.Is(err, media.ErrNotUploaded):
		p.fail(ctx, job, msgUnusable)
	case errors.As(err, &pe) && provider.Classify(err) == provider.ClassRejected:
		p.fail(ctx, job, msgUnusable)
	case provider.IsTransient(err):
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
	p.advance(ctx, job, jobs.Update{Stage: ptr(stageFetching), RetryDelta: 1, NextRun: &next})
}

func (p *Processor) fail(ctx context.Context, job jobs.Job, message string) {
	// Detached so the failure is recorded even while shutting down.
	saveCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 20*time.Second)
	defer cancel()
	p.advance(saveCtx, job, jobs.Update{Status: jobs.StatusFailed, Error: message})
}

func (p *Processor) advance(ctx context.Context, job jobs.Job, u jobs.Update) bool {
	if _, err := p.Jobs.Advance(ctx, job.ID, u); err != nil {
		if !errors.Is(err, jobs.ErrInvalidTransition) && ctx.Err() == nil {
			slog.Error("advance analysis job", "job_id", job.ID, "error", err)
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

func (p *Processor) loadUpload(ctx context.Context, userID, id string) (gemini.Media, error) {
	if p.Uploads == nil {
		return gemini.Media{}, video.ErrNoVideoFile
	}
	data, mime, err := p.Uploads.Load(ctx, userID, id, MaxInlineBytes)
	if err != nil {
		return gemini.Media{}, err
	}
	return gemini.Media{Data: data, MIME: mime}, nil
}
