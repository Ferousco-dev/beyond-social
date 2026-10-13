// Package avatarvideo turns a script into a video spoken by one of the user's
// ready avatars, using HeyGen, and tracks it as a durable job.
package avatarvideo

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
)

const (
	JobType = "avatar_video"

	maxScriptRunes   = 3000
	maxKeyLength     = 128
	maxActivePerUser = 2
)

var (
	ErrInvalid         = errors.New("invalid video request")
	ErrAvatarNotFound  = errors.New("avatar not found")
	ErrAvatarNotReady  = errors.New("avatar is not ready")
	ErrVoiceNotAllowed = errors.New("voice is not available")
	ErrNoVoice         = errors.New("avatar has no voice")
	ErrTooManyBusy     = errors.New("too many videos in progress")
)

type AvatarLookup interface {
	Get(ctx context.Context, userID, id string) (avatars.Avatar, error)
}

type VoiceCheck interface {
	Allowed(ctx context.Context, userID, voiceID string) error
}

type Service struct {
	jobs    *jobs.Service
	avatars AvatarLookup
	voices  VoiceCheck
}

func NewService(j *jobs.Service, a AvatarLookup, v VoiceCheck) *Service {
	return &Service{jobs: j, avatars: a, voices: v}
}

type SubmitInput struct {
	AvatarID       string
	VoiceID        string // optional; defaults to the avatar's own voice
	Script         string
	IdempotencyKey string
}

// Submit validates the request and queues a job. It returns before HeyGen is
// called; a repeated idempotency key returns the original job with isNew=false.
func (s *Service) Submit(ctx context.Context, userID string, in SubmitInput) (jobs.Job, bool, error) {
	script, err := cleanScript(in.Script)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if len(in.IdempotencyKey) > maxKeyLength || strings.ContainsFunc(in.IdempotencyKey, func(r rune) bool { return r < 0x20 || r > 0x7e }) {
		return jobs.Job{}, false, fmt.Errorf("%w: invalid idempotency key", ErrInvalid)
	}

	avatar, err := s.avatars.Get(ctx, userID, in.AvatarID)
	if errors.Is(err, avatars.ErrNotFound) {
		return jobs.Job{}, false, ErrAvatarNotFound
	}
	if err != nil {
		return jobs.Job{}, false, err
	}
	if avatar.Status != avatars.StatusReady || avatar.LookID == "" {
		return jobs.Job{}, false, ErrAvatarNotReady
	}

	voiceID := in.VoiceID
	if voiceID == "" {
		voiceID = avatar.VoiceID
	}
	if voiceID == "" {
		return jobs.Job{}, false, ErrNoVoice
	}
	if err := s.voices.Allowed(ctx, userID, voiceID); err != nil {
		if errors.Is(err, voices.ErrNotAllowed) {
			return jobs.Job{}, false, ErrVoiceNotAllowed
		}
		return jobs.Job{}, false, err
	}

	active, err := s.jobs.CountActive(ctx, userID, JobType)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if active >= maxActivePerUser {
		return jobs.Job{}, false, ErrTooManyBusy
	}

	// Provider IDs for the look are looked up again when the job runs, so they
	// never sit in the job's input, which is shown to the owner.
	return s.jobs.Create(ctx, userID, JobType, map[string]any{
		"avatar_id": avatar.ID, "voice_id": voiceID, "script": script, "title": title(script),
	}, in.IdempotencyKey)
}

func cleanScript(raw string) (string, error) {
	s := strings.TrimSpace(raw)
	n := utf8.RuneCountInString(s)
	if n == 0 || n > maxScriptRunes {
		return "", fmt.Errorf("%w: script must be 1-%d characters", ErrInvalid, maxScriptRunes)
	}
	if strings.ContainsFunc(s, func(r rune) bool { return unicode.IsControl(r) && r != '\n' && r != '\t' }) {
		return "", fmt.Errorf("%w: script contains unsupported characters", ErrInvalid)
	}
	return s, nil
}

func title(script string) string {
	line, _, _ := strings.Cut(script, "\n")
	line = strings.TrimSpace(line)
	if r := []rune(line); len(r) > 60 {
		return string(r[:57]) + "..."
	}
	return line
}
