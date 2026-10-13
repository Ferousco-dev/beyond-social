// Package transform runs the video-to-video workflow: take a video the user
// discovered, fetch a safe copy, hand it to KIE AI, and track the task until
// the provider confirms it finished.
package transform

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

const (
	JobType = "video_transform"

	// KIE requires a prompt of at least two characters, so an omitted one gets a
	// neutral default rather than failing the request.
	defaultPrompt    = "Restyle this video with a polished, cinematic look while keeping its subject, framing and motion."
	maxPromptRunes   = 2000
	minPromptRunes   = 2
	maxKeyLength     = 128
	maxActivePerUser = 3

	defaultDuration   = "5"
	defaultResolution = "720p"
)

var (
	ErrInvalid       = errors.New("invalid transform request")
	ErrVideoNotFound = errors.New("video not found")
	ErrTooManyBusy   = errors.New("too many transformations in progress")
)

// VideoLookup finds a discovered video by ID for one user. Anything not owned
// by that user must be reported as discovery.ErrNotFound.
type VideoLookup interface {
	Video(ctx context.Context, userID, videoID string) (video.Video, error)
}

type Service struct {
	jobs   *jobs.Service
	videos VideoLookup
}

func NewService(j *jobs.Service, v VideoLookup) *Service { return &Service{jobs: j, videos: v} }

// Submit validates the request, checks the user can use the video, and queues a
// job. It returns at once; generation happens in the background. A repeated
// idempotency key returns the original job with isNew=false.
func (s *Service) Submit(ctx context.Context, userID, videoID, prompt, idempotencyKey string) (jobs.Job, bool, error) {
	prompt, err := cleanPrompt(prompt)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if len(idempotencyKey) > maxKeyLength || strings.IndexFunc(idempotencyKey, func(r rune) bool { return r < 0x20 || r > 0x7e }) >= 0 {
		return jobs.Job{}, false, fmt.Errorf("%w: idempotency key must be printable ASCII up to %d characters", ErrInvalid, maxKeyLength)
	}

	v, err := s.videos.Video(ctx, userID, videoID)
	if errors.Is(err, discovery.ErrNotFound) {
		return jobs.Job{}, false, ErrVideoNotFound
	}
	if err != nil {
		return jobs.Job{}, false, err
	}

	active, err := s.jobs.CountActive(ctx, userID, JobType)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if active >= maxActivePerUser {
		return jobs.Job{}, false, ErrTooManyBusy
	}

	return s.jobs.Create(ctx, userID, JobType, map[string]any{
		"video_id":        v.ID,
		"platform":        string(v.Platform),
		"source_url":      v.PageURL,
		"source_video_id": v.SourceID,
		"prompt":          prompt,
		"duration":        defaultDuration,
		"resolution":      defaultResolution,
	}, idempotencyKey)
}

func cleanPrompt(raw string) (string, error) {
	p := strings.TrimSpace(raw)
	if p == "" {
		return defaultPrompt, nil
	}
	if n := utf8.RuneCountInString(p); n < minPromptRunes || n > maxPromptRunes || strings.IndexFunc(p, func(r rune) bool { return unicode.IsControl(r) && r != '\n' && r != '\t' }) >= 0 {
		return "", fmt.Errorf("%w: prompt must be %d-%d characters", ErrInvalid, minPromptRunes, maxPromptRunes)
	}
	return p, nil
}
