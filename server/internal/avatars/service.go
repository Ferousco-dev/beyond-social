package avatars

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/storage"
	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
)

const (
	// ConsentVersion must match the wording shown in the recorder
	// (client/src/features/live-avatar/consent.ts). Acceptances of older
	// wording do not count.
	ConsentVersion = 1

	// FootageBucket is the private bucket the recorder uploads into.
	FootageBucket = "avatar-footage"
	// MaxFootageBytes is HeyGen's direct-upload ceiling for video.
	MaxFootageBytes = 200 << 20

	defaultName      = "My avatar"
	maxNameRunes     = 60
	maxPendingAvatar = 2

	EventUpdated = "avatar.updated"
	EventDeleted = "avatar.deleted"
)

// Footage is the part of storage the service needs.
type Footage interface {
	Stat(ctx context.Context, bucket, path string) (storage.Info, error)
	SignedURL(ctx context.Context, bucket, path string, ttl time.Duration) (string, error)
	Delete(ctx context.Context, bucket, path string) error
	SignedUploadToken(ctx context.Context, bucket, path string) (string, error)
}

// Provider is the part of the HeyGen client used here.
type Provider interface {
	CreateDigitalTwin(ctx context.Context, name, fileURL, idempotencyKey string) (heygen.Twin, error)
	GetGroup(ctx context.Context, groupID string) (heygen.Twin, error)
	GetLook(ctx context.Context, lookID string) (heygen.Twin, error)
	CreateConsent(ctx context.Context, groupID, rerouteURL, idempotencyKey string) (string, error)
	DeleteAvatarGroup(ctx context.Context, groupID string) error
	DeleteVoice(ctx context.Context, voiceID string) error
}

// VoiceChecker says whether a user may speak with a given voice.
type VoiceChecker interface {
	Allowed(ctx context.Context, userID, voiceID string) error
}

// Biller charges for training an avatar. Close settles one that became ready
// and refunds one that failed; it must be safe to repeat.
type Biller interface {
	Reserve(ctx context.Context, userID, avatarID string) error
	Close(ctx context.Context, userID, avatarID string, delivered bool) error
}

type Service struct {
	biller         Biller
	voices         VoiceChecker
	repo           Repository
	footage        Footage
	provider       Provider
	publisher      realtime.Publisher
	allowedOrigins []string
	now            func() time.Time
}

func NewService(repo Repository, footage Footage, provider Provider, publisher realtime.Publisher, allowedOrigins []string) *Service {
	return &Service{repo: repo, footage: footage, provider: provider, publisher: publisher, allowedOrigins: allowedOrigins, now: time.Now}
}

func (s *Service) Get(ctx context.Context, userID, id string) (Avatar, error) {
	a, err := s.repo.Get(ctx, userID, id)
	if err == nil {
		a.Resolve(s.now())
	}
	return a, err
}

func (s *Service) List(ctx context.Context, userID string, limit, offset int) ([]Avatar, bool, error) {
	rows, err := s.repo.List(ctx, userID, limit+1, offset)
	if err != nil {
		return nil, false, err
	}
	more := len(rows) > limit
	if more {
		rows = rows[:limit]
	}
	for i := range rows {
		rows[i].Resolve(s.now())
	}
	return rows, more, nil
}

// RefreshConsent issues a new hosted consent link when the old one has expired.
func (s *Service) RefreshConsent(ctx context.Context, userID, id string) (Avatar, error) {
	a, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return Avatar{}, err
	}
	if a.TrainingStatus != trainingPending || a.GroupID == "" {
		return Avatar{}, ErrNotReady
	}
	link, err := s.provider.CreateConsent(ctx, a.GroupID, a.RerouteURL, "consent-"+a.ID+"-"+fmt.Sprint(s.now().Unix()/3600))
	if err != nil {
		return Avatar{}, err
	}
	updated, err := s.advance(ctx, a.ID, consentUpdate(link, s.now()))
	if err != nil {
		return Avatar{}, err
	}
	return updated, nil
}

// advance applies an update and tells the owner, in that order, so an event is
// never sent for state that was not saved.
func (s *Service) advance(ctx context.Context, id string, u Update) (Avatar, error) {
	a, err := s.repo.Advance(ctx, id, u)
	if err != nil {
		return Avatar{}, err
	}
	a.Resolve(s.now())
	s.publish(a)
	s.closeCharge(ctx, a)
	return a, nil
}

// closeCharge settles or refunds once training is final. A failure is logged,
// not returned: the avatar is already final and the sweeper closes anything missed.
func (s *Service) closeCharge(ctx context.Context, a Avatar) {
	if s.biller == nil || (a.Status != StatusReady && a.Status != StatusFailed) {
		return
	}
	closeCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	if err := s.biller.Close(closeCtx, a.UserID, a.ID, a.Status == StatusReady); err != nil {
		slog.Error("close avatar charge", "avatar_id", a.ID, "user_id", a.UserID, "error", err)
	}
}

// WithBiller turns on charging. Without one training is free.
func (s *Service) WithBiller(b Biller) *Service {
	s.biller = b
	return s
}

func (s *Service) publish(a Avatar) {
	if s.publisher == nil {
		return
	}
	event, err := realtime.NewEvent(EventUpdated, a.ID, a)
	if err != nil {
		slog.Error("build avatar event", "avatar_id", a.ID, "error", err)
		return
	}
	s.publisher.Publish(a.UserID, event)
}

// WithVoices enables SelectVoice.
func (s *Service) WithVoices(v VoiceChecker) *Service {
	s.voices = v
	return s
}

// SelectVoice sets the voice an avatar speaks with. The avatar must belong to
// the user and be ready, and the voice must be one they are allowed to use.
func (s *Service) SelectVoice(ctx context.Context, userID, id, voiceID string) (Avatar, error) {
	a, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return Avatar{}, err
	}
	if a.TrainingStatus != trainingReady {
		return Avatar{}, ErrNotReady
	}
	if err := s.voices.Allowed(ctx, userID, voiceID); err != nil {
		if errors.Is(err, voices.ErrNotAllowed) {
			return Avatar{}, ErrVoiceNotAllowed
		}
		return Avatar{}, err
	}
	updated, err := s.repo.SelectVoice(ctx, userID, id, voiceID)
	if err != nil {
		return Avatar{}, err
	}
	updated.Resolve(s.now())
	s.publish(updated)
	return updated, nil
}
