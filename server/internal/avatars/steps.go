package avatars

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

func (p *Processor) submit(ctx context.Context, a Avatar) {
	s := p.Service
	link, err := s.footage.SignedURL(ctx, FootageBucket, a.StoragePath, signedURLTTL)
	if err != nil {
		p.submitFailed(ctx, a, err)
		return
	}
	// Recorded before the call that starts paid training.
	if _, err := s.advance(ctx, a.ID, Update{MarkSubmitting: true}); err != nil {
		p.logAdvance(a, err)
		return
	}
	twin, err := s.provider.CreateDigitalTwin(ctx, a.Name, link, "avatar-"+a.ID)
	if err != nil {
		p.submitFailed(ctx, a, err)
		return
	}
	next := p.now().Add(3 * time.Second)
	u := Update{GroupID: &twin.GroupID, LookID: &twin.LookID, TwinVoiceID: strPtr(twin.DefaultVoiceID),
		ConsentStatus: strPtr(twin.ConsentStatus), NextRun: &next}
	if _, err := s.advance(ctx, a.ID, u); err != nil {
		slog.Error("could not save provider ids", "avatar_id", a.ID, "group_id", twin.GroupID, "error", err)
	}
}

func (p *Processor) poll(ctx context.Context, a Avatar) {
	s := p.Service
	group, err := s.provider.GetGroup(ctx, a.GroupID)
	if err != nil {
		p.pollFailed(ctx, a, err)
		return
	}
	look, err := s.provider.GetLook(ctx, a.LookID)
	if err != nil {
		p.pollFailed(ctx, a, err)
		return
	}

	switch {
	case group.Status == heygen.StatusFailed || look.Status == heygen.StatusFailed:
		slog.Warn("avatar training failed at provider", "avatar_id", a.ID, "code", firstNonEmpty(group.ErrorCode, look.ErrorCode))
		p.fail(ctx, a, friendly(firstNonEmpty(group.ErrorCode, look.ErrorCode), firstNonEmpty(group.ErrorMessage, look.ErrorMessage)))
	case group.ConsentStatus == heygen.ConsentRejected:
		p.fail(ctx, a, msgConsent)
	case group.Status == heygen.StatusCompleted && look.Status == heygen.StatusCompleted:
		p.ready(ctx, a, group, look)
	default:
		p.waiting(ctx, a, group)
	}
}

func (p *Processor) ready(ctx context.Context, a Avatar, group, look heygen.Twin) {
	voice := firstNonEmpty(group.DefaultVoiceID, look.DefaultVoiceID, a.TwinVoiceID)
	if voice == "" {
		p.fail(ctx, a, msgMissingVoice)
		return
	}
	now := p.now()
	u := Update{
		TrainingStatus: trainingReady, TwinVoiceID: &voice, ConsentStatus: strPtr(group.ConsentStatus), ConsentURL: strPtr(""),
		PreviewImage: strPtr(group.PreviewImage), PreviewVideo: strPtr(group.PreviewVideo), MarkTrained: true, PollDelta: 1, NextRun: &now,
	}
	u.SelectedVoiceID = &voice // the repository only applies it while none is chosen
	if _, err := p.Service.advance(ctx, a.ID, u); err != nil {
		p.logAdvance(a, err)
	}
}

// waiting keeps polling, and makes sure the person has a live consent link
// while HeyGen is waiting on them.
func (p *Processor) waiting(ctx context.Context, a Avatar, group heygen.Twin) {
	s := p.Service
	u := Update{ConsentStatus: strPtr(group.ConsentStatus), PollDelta: 1}
	needsConsent := group.ConsentStatus != heygen.ConsentAccepted && group.ConsentStatus != heygen.ConsentRejected
	expired := a.ConsentURL == "" || (a.ConsentExpiresAt != nil && !a.ConsentExpiresAt.After(p.now()))
	if needsConsent && expired {
		link, err := s.provider.CreateConsent(ctx, a.GroupID, a.RerouteURL, "consent-"+a.ID+"-"+p.now().Format("2006010215"))
		if err != nil {
			slog.Warn("could not create consent link", "avatar_id", a.ID, "error", err)
		} else {
			cu := consentUpdate(link, p.now())
			u.ConsentURL, u.ConsentExpires = cu.ConsentURL, cu.ConsentExpires
		}
	}
	next := p.now().Add(pollDelay(a.PollCount))
	u.NextRun = &next
	if _, err := s.advance(ctx, a.ID, u); err != nil {
		p.logAdvance(a, err)
	}
}

// submitFailed handles a failed submission. Everything transient, including a
// dropped connection after the request was sent, is retried with the same
// Idempotency-Key, which makes the retry safe: HeyGen replays the original
// avatar rather than training another. A 409 means the original is still being
// handled. Retrying continues until the replay window closes.
func (p *Processor) submitFailed(ctx context.Context, a Avatar, err error) {
	if ctx.Err() != nil {
		return
	}
	slog.Warn("avatar submit failed", "avatar_id", a.ID, "attempt", a.PollCount+1, "error", err)
	if !retryable(err) {
		p.fail(ctx, a, msgUnavailable)
		return
	}
	next := p.now().Add(submitBackoff(a.PollCount))
	if _, aerr := p.Service.advance(ctx, a.ID, Update{PollDelta: 1, NextRun: &next}); aerr != nil {
		p.logAdvance(a, aerr)
	}
}

func retryable(err error) bool {
	return provider.IsTransient(err) || heygen.HTTPStatus(err) == http.StatusConflict
}

// submitBackoff is 10s, 20s, 40s ... capped at five minutes.
func submitBackoff(attempt int) time.Duration {
	return min(time.Duration(10<<min(attempt, 5))*time.Second, 5*time.Minute)
}

// pollFailed treats provider errors while polling as retryable until the avatar's
// overall deadline, since the avatar itself is still training on HeyGen's side.
func (p *Processor) pollFailed(ctx context.Context, a Avatar, err error) {
	if ctx.Err() != nil {
		return
	}
	slog.Warn("avatar status check failed", "avatar_id", a.ID, "error", err)
	if !provider.IsTransient(err) && heygen.HTTPStatus(err) != 404 {
		p.fail(ctx, a, msgUnavailable)
		return
	}
	next := p.now().Add(pollDelay(a.PollCount))
	if _, aerr := p.Service.advance(ctx, a.ID, Update{PollDelta: 1, NextRun: &next}); aerr != nil {
		p.logAdvance(a, aerr)
	}
}
