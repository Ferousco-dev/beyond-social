// Package avatars registers a user's HeyGen digital twin: it takes the user's
// recording, has HeyGen train it, walks the person through HeyGen's consent
// step, and tracks the result until the avatar is ready to use.
package avatars

import (
	"context"
	"errors"
	"time"
)

// Status is the stable, user-facing state. It is derived from the stored
// training status and consent link, not copied from HeyGen's vocabulary.
type Status string

const (
	StatusTraining        Status = "training"
	StatusAwaitingConsent Status = "awaiting_consent"
	StatusReady           Status = "ready"
	StatusFailed          Status = "failed"
)

// Stored training statuses (the avatars.training_status values).
const (
	trainingPending = "pending"
	trainingReady   = "ready"
	trainingFailed  = "failed"
)

var (
	ErrNotFound         = errors.New("avatar not found")
	ErrInvalid          = errors.New("invalid avatar request")
	ErrConsentRequired  = errors.New("consent is required")
	ErrFootageMissing   = errors.New("recording not found")
	ErrFootageTooLarge  = errors.New("recording is too large")
	ErrUnsupportedMedia = errors.New("unsupported recording format")
	ErrTooManyBusy      = errors.New("too many avatars in progress")
	ErrLimitReached     = errors.New("avatar limit reached")
	ErrFinished         = errors.New("avatar already finished")
	ErrNotReady         = errors.New("avatar is not ready")
	ErrVoiceNotAllowed  = errors.New("voice is not available to this user")
)

type Avatar struct {
	ID               string     `json:"id"`
	Name             string     `json:"name"`
	IsDefault        bool       `json:"is_default"`
	Status           Status     `json:"status"`
	ConsentURL       string     `json:"consent_url,omitempty"`
	ConsentExpiresAt *time.Time `json:"consent_expires_at,omitempty"`
	VoiceID          string     `json:"voice_id,omitempty"`
	PreviewImageURL  string     `json:"preview_image_url,omitempty"`
	PreviewVideoURL  string     `json:"preview_video_url,omitempty"`
	Error            string     `json:"error,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	TrainedAt        *time.Time `json:"trained_at,omitempty"`

	// Internal. Provider IDs stay distinct from our own and never reach clients.
	UserID          string     `json:"-"`
	TrainingStatus  string     `json:"-"`
	StoragePath     string     `json:"-"`
	GroupID         string     `json:"-"`
	LookID          string     `json:"-"`
	TwinVoiceID     string     `json:"-"` // the voice HeyGen cloned from the footage
	ConsentStatus   string     `json:"-"`
	RerouteURL      string     `json:"-"`
	PollCount       int        `json:"-"`
	SubmitStartedAt *time.Time `json:"-"`
	FootageDeleted  bool       `json:"-"`
}

// Resolve fills Status and drops a consent link that has expired.
func (a *Avatar) Resolve(now time.Time) {
	if a.ConsentURL != "" && a.ConsentExpiresAt != nil && !a.ConsentExpiresAt.After(now) {
		a.ConsentURL, a.ConsentExpiresAt = "", nil
	}
	switch {
	case a.TrainingStatus == trainingReady:
		a.Status = StatusReady
	case a.TrainingStatus == trainingFailed:
		a.Status = StatusFailed
	case a.ConsentURL != "":
		a.Status = StatusAwaitingConsent
	default:
		a.Status = StatusTraining
	}
	if a.Status != StatusAwaitingConsent {
		a.ConsentURL, a.ConsentExpiresAt = "", nil
	}
}

// Update is a worker-side change. Nil or zero values leave the field unchanged.
type Update struct {
	TrainingStatus  string
	GroupID         *string
	LookID          *string
	TwinVoiceID     *string
	SelectedVoiceID *string
	ConsentStatus   *string
	ConsentURL      *string // empty string clears it
	ConsentExpires  *time.Time
	PreviewImage    *string
	PreviewVideo    *string
	Error           string
	MarkSubmitting  bool
	MarkTrained     bool
	PollDelta       int
	NextRun         *time.Time
}

type NewAvatar struct {
	UserID         string
	Name           string
	StoragePath    string
	ConsentVersion int
	RerouteURL     string
	IdempotencyKey string
}

type Repository interface {
	// Create inserts the avatar; a repeated idempotency key returns the original.
	Create(ctx context.Context, n NewAvatar) (a Avatar, isNew bool, err error)
	Get(ctx context.Context, userID, id string) (Avatar, error)
	List(ctx context.Context, userID string, limit, offset int) ([]Avatar, error)
	CountPending(ctx context.Context, userID string) (int, error)
	// Delete removes an avatar the user owns, handing the default to the newest
	// remaining one when needed. It reports whether a row was removed.
	Delete(ctx context.Context, userID, id string) (bool, error)
	// SetDefault makes one ready avatar the user owns their default.
	SetDefault(ctx context.Context, userID, id string) (Avatar, error)
	// VoiceInUse reports whether any other avatar or voice profile uses the voice.
	VoiceInUse(ctx context.Context, voiceID, exceptAvatarID string) (bool, error)
	// SelectVoice sets the voice for an avatar the user owns.
	SelectVoice(ctx context.Context, userID, id, voiceID string) (Avatar, error)

	Claim(ctx context.Context, limit int, lease time.Duration) ([]Avatar, error)
	Advance(ctx context.Context, id string, u Update) (Avatar, error)
	// FootageGone records that the source recording was deleted (or gives the
	// next time to retry deleting it).
	FootageGone(ctx context.Context, id string, retryAt *time.Time) error
}
