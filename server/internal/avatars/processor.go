package avatars

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"time"
)

// Lease keeps a claimed avatar from being picked up again mid-step.
const Lease = 90 * time.Second

const (
	maxAge = 24 * time.Hour
	// replayWindow is how long HeyGen replays a repeated Idempotency-Key. Resubmitting
	// with the same key inside it is safe: it returns the original avatar, or creates
	// exactly one if the first request never arrived.
	replayWindow    = 23 * time.Hour
	maxCleanupTries = 20
	consentTTL      = 23 * time.Hour // HeyGen's link lasts 24h; refresh a little early
	signedURLTTL    = 6 * time.Hour

	msgTooShortOrLong = "Your recording must be between 15 seconds and 10 minutes long."
	msgConsent        = "Consent was not approved, so the avatar could not be created."
	msgTraining       = "The avatar could not be trained from that recording. Try recording again."
	msgUnavailable    = "Avatar training is temporarily unavailable. Please try again shortly."
	msgInterrupted    = "The request was interrupted before it could be confirmed. Please record again."
	msgTimedOut       = "Training took too long and was stopped. Please record again."
	msgMissingVoice   = "Training finished without a voice. Please record again."
)

type Processor struct {
	Service *Service
	Repo    Repository
	Now     func() time.Time
}

func (p *Processor) now() time.Time {
	if p.Now != nil {
		return p.Now()
	}
	return time.Now()
}

// Handle advances one claimed avatar by a single step. Rows that already
// reached a final state are only here to have their recording deleted.
func (p *Processor) Handle(ctx context.Context, a Avatar) {
	if a.TrainingStatus != trainingPending {
		p.cleanup(ctx, a)
		return
	}
	switch {
	case p.now().Sub(a.CreatedAt) > maxAge:
		p.fail(ctx, a, msgTimedOut)
	case a.GroupID == "" && a.SubmitStartedAt != nil && p.now().Sub(*a.SubmitStartedAt) > replayWindow:
		// HeyGen replays an identical request for 24 hours. Past that, resubmitting
		// could train a second avatar, and there is no lookup to check for the first.
		slog.Error("avatar submission unconfirmed after the replay window; check the HeyGen account manually",
			"avatar_id", a.ID, "idempotency_key", "avatar-"+a.ID, "submitted_at", a.SubmitStartedAt)
		p.fail(ctx, a, msgInterrupted)
	case a.GroupID == "":
		p.submit(ctx, a)
	default:
		p.poll(ctx, a)
	}
}

func (p *Processor) fail(ctx context.Context, a Avatar, message string) {
	saveCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	now := p.now()
	_, err := p.Service.advance(saveCtx, a.ID, Update{TrainingStatus: trainingFailed, Error: message, ConsentURL: strPtr(""), NextRun: &now})
	if err != nil {
		p.logAdvance(a, err)
	}
}

// cleanup deletes the source recording once it is no longer needed.
func (p *Processor) cleanup(ctx context.Context, a Avatar) {
	if a.FootageDeleted || a.StoragePath == "" {
		_ = p.Repo.FootageGone(ctx, a.ID, nil)
		return
	}
	if err := p.Service.footage.Delete(ctx, FootageBucket, a.StoragePath); err != nil {
		slog.Warn("could not delete recording", "avatar_id", a.ID, "error", err)
		var retry *time.Time
		if a.PollCount < maxCleanupTries {
			t := p.now().Add(5 * time.Minute)
			retry = &t
		}
		_ = p.Repo.FootageGone(ctx, a.ID, retry)
		return
	}
	_ = p.Repo.FootageGone(ctx, a.ID, nil)
}

func (p *Processor) logAdvance(a Avatar, err error) {
	if !errors.Is(err, ErrFinished) {
		slog.Error("advance avatar", "avatar_id", a.ID, "error", err)
	}
}

func pollDelay(polls int) time.Duration {
	switch {
	case polls < 12:
		return 5 * time.Second
	case polls < 60:
		return 15 * time.Second
	}
	return time.Minute
}

// friendly turns HeyGen's failure into a sentence safe to show. Anything not
// recognised becomes a generic message; provider text is never passed through.
func friendly(_, message string) string {
	m := strings.ToLower(message)
	if strings.Contains(m, "duration") {
		return msgTooShortOrLong
	}
	return msgTraining
}

func consentUpdate(link string, now time.Time) Update {
	expires := now.Add(consentTTL)
	return Update{ConsentURL: &link, ConsentExpires: &expires}
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func strPtr(s string) *string { return &s }
