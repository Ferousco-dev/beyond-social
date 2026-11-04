package publish

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

const (
	Lease         = 5 * time.Minute
	HandleTimeout = 4 * time.Minute
	// Bucket and size limit for the copy kept until the post goes out.
	Bucket       = "user-media"
	maxVideoSize = 100 << 20
	maxAttempts  = 3

	msgUnusable    = "That video could not be used for posting."
	msgReconnect   = "Connect your %s account again to post. The saved sign-in no longer works."
	msgDisconnect  = "Your %s account is no longer connected."
	msgUnconfirmed = "We could not confirm that this post went out. Please check your %s account before trying again."
	msgUnavailable = "Posting is unavailable right now. Please try again later."
)

// Fetcher downloads untrusted media with size and address limits.
type Fetcher interface {
	Fetch(ctx context.Context, rawURL string, maxBytes int64) ([]byte, error)
}

// Vault keeps the copy of the video until it is posted.
type Vault interface {
	Upload(ctx context.Context, bucket, path, contentType string, data []byte) error
	SignedURL(ctx context.Context, bucket, path string, ttl time.Duration) (string, error)
}

// Tokens hands out a usable sign-in, renewing it when needed.
type Tokens interface {
	Token(ctx context.Context, userID string, p social.Platform) (social.Tokens, social.Connection, error)
}

type Processor struct {
	Store      Store
	Fetcher    Fetcher
	Vault      Vault
	Tokens     Tokens
	Publishers map[social.Platform]social.Publisher
	Alerts     alerts.Reporter
	Now        func() time.Time
}

func (p *Processor) now() time.Time {
	if p.Now != nil {
		return p.Now()
	}
	return time.Now()
}

// Handle advances one claimed post by a step.
func (p *Processor) Handle(ctx context.Context, post Post) {
	switch post.Status {
	case StatusPreparing:
		p.prepare(ctx, post)
	case StatusScheduled, StatusPublishing:
		p.publish(ctx, post)
	}
}

// prepare copies the video somewhere that will still exist at posting time.
func (p *Processor) prepare(ctx context.Context, post Post) {
	data, err := p.Fetcher.Fetch(ctx, post.SourceURL, maxVideoSize)
	var mime string
	if err == nil {
		mime, err = safenet.SniffVideo(data)
	}
	if err != nil {
		p.prepareFailed(ctx, post, err)
		return
	}
	path := fmt.Sprintf("%s/posts/%s%s", post.UserID, post.ID, extension(mime))
	if err := p.Vault.Upload(ctx, Bucket, path, mime, data); err != nil {
		p.prepareFailed(ctx, post, err)
		return
	}
	due := post.ScheduledAt
	if now := p.now(); due.Before(now) {
		due = now
	}
	p.advance(ctx, post, Update{Status: StatusScheduled, StoragePath: &path, NextRun: &due})
}

func (p *Processor) prepareFailed(ctx context.Context, post Post, err error) {
	if ctx.Err() != nil {
		return
	}
	alerts.Report(ctx, p.Alerts, err, alerts.Context{Source: "post preparation", UserID: post.UserID, Resource: post.ID})
	slog.Warn("prepare post failed", "post_id", post.ID, "attempt", post.Attempts+1, "error", err)
	switch {
	case errors.Is(err, safenet.ErrTooLarge), errors.Is(err, safenet.ErrBadMediaType), errors.Is(err, safenet.ErrBlockedURL):
		p.fail(ctx, post, msgUnusable)
	case provider.IsTransient(err) || !isProvider(err):
		p.retry(ctx, post, StatusPreparing)
	default:
		p.fail(ctx, post, msgUnavailable)
	}
}

func (p *Processor) publish(ctx context.Context, post Post) {
	label := string(post.Platform)
	// A post that was started and never recorded as finished may already be
	// public. Sending it again could post it twice, so it is reported instead.
	if post.PublishStartedAt != nil {
		p.fail(ctx, post, fmt.Sprintf(msgUnconfirmed, label))
		return
	}
	// Only the lease ever calls this early, but a post is never sent before its time.
	if due := post.ScheduledAt; post.Status == StatusScheduled && p.now().Before(due.Add(-5*time.Second)) {
		p.advance(ctx, post, Update{NextRun: &due})
		return
	}
	publisher, ok := p.Publishers[post.Platform]
	if !ok {
		p.fail(ctx, post, msgUnavailable)
		return
	}
	// Everything that can fail safely comes before the platform is called.
	tokens, conn, err := p.Tokens.Token(ctx, post.UserID, post.Platform)
	switch {
	case errors.Is(err, social.ErrReconnect):
		p.fail(ctx, post, fmt.Sprintf(msgReconnect, label))
		return
	case errors.Is(err, social.ErrNotConnected):
		p.fail(ctx, post, fmt.Sprintf(msgDisconnect, label))
		return
	case err != nil:
		p.beforeSend(ctx, post, err)
		return
	}
	data, mime, link, err := p.load(ctx, post)
	if err != nil {
		p.beforeSend(ctx, post, err)
		return
	}
	if !p.advance(ctx, post, Update{Status: StatusPublishing, MarkStarted: true}) {
		return
	}

	result, err := publisher.Publish(ctx, tokens, social.PublishInput{
		Title: post.Title, Caption: post.Caption, Visibility: post.Visibility, Video: data, MIME: mime, VideoURL: link, AccountID: conn.AccountID,
	})
	if err != nil {
		p.afterSend(ctx, post, err)
		return
	}
	p.advance(ctx, post, Update{Status: StatusPublished, ExternalID: result.ID, ExternalURL: result.URL})
}

// load reads the kept copy of the video, and gives back a short-lived link to it
// for the platforms that fetch the file themselves.
func (p *Processor) load(ctx context.Context, post Post) ([]byte, string, string, error) {
	link, err := p.Vault.SignedURL(ctx, Bucket, post.StoragePath, 30*time.Minute)
	if err != nil {
		return nil, "", "", err
	}
	data, err := p.Fetcher.Fetch(ctx, link, maxVideoSize)
	if err != nil {
		return nil, "", "", err
	}
	mime, err := safenet.SniffVideo(data)
	return data, mime, link, err
}

// beforeSend handles a failure while nothing has been sent: retrying is safe.
func (p *Processor) beforeSend(ctx context.Context, post Post, err error) {
	if ctx.Err() != nil {
		return
	}
	alerts.Report(ctx, p.Alerts, err, alerts.Context{Source: "post", UserID: post.UserID, Resource: post.ID})
	slog.Warn("post could not start", "post_id", post.ID, "attempt", post.Attempts+1, "error", err)
	p.retry(ctx, post, post.Status)
}

// afterSend handles a failure once the platform has been called. Only a definite
// refusal is final and safe to explain; anything else is ambiguous.
func (p *Processor) afterSend(ctx context.Context, post Post, err error) {
	alerts.Report(ctx, p.Alerts, err, alerts.Context{Source: "post", UserID: post.UserID, Resource: post.ID})
	slog.Warn("publish failed", "post_id", post.ID, "error", err)
	var pe *provider.Error
	if errors.As(err, &pe) && !pe.Transient && pe.Message != "" {
		p.fail(ctx, post, pe.Message)
		return
	}
	p.fail(ctx, post, fmt.Sprintf(msgUnconfirmed, post.Platform))
}

func (p *Processor) retry(ctx context.Context, post Post, status Status) {
	if post.Attempts+1 >= maxAttempts {
		p.fail(ctx, post, msgUnavailable)
		return
	}
	next := p.now().Add(time.Duration(30<<post.Attempts) * time.Second)
	p.advance(ctx, post, Update{Status: status, NextRun: &next, AttemptsDelta: 1})
}

func (p *Processor) fail(ctx context.Context, post Post, message string) {
	// Detached so the failure is recorded even while shutting down.
	saveCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 20*time.Second)
	defer cancel()
	p.advance(saveCtx, post, Update{Status: StatusFailed, Error: message})
}

func (p *Processor) advance(ctx context.Context, post Post, u Update) bool {
	if _, err := p.Store.Advance(ctx, post.ID, u); err != nil {
		if !errors.Is(err, ErrNotFound) && ctx.Err() == nil {
			slog.Error("advance post", "post_id", post.ID, "error", err)
		}
		return false
	}
	return true
}

func isProvider(err error) bool {
	var pe *provider.Error
	return errors.As(err, &pe)
}

func extension(mime string) string {
	switch mime {
	case "video/quicktime":
		return ".mov"
	case "video/x-matroska":
		return ".mkv"
	}
	return ".mp4"
}
