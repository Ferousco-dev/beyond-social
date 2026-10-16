// Package generate makes a new video from a prompt or a script with Kling 3.0
// on KIE, optionally starting from a picture the user attached. One request is
// one clip of at most 15 seconds; a longer script is several requests.
package generate

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/google/uuid"
)

// JobType is the type under which clips are stored and claimed.
const JobType = "video_generate"

// Model is the KIE model every clip uses. Kling is the product's model.
const Model = "kling-3.0/video"

// Limits from the model's documentation.
const (
	MinClipSeconds   = 3
	MaxClipSeconds   = 15
	MaxShotSeconds   = 12
	MaxScenes        = 6
	MaxShotRunes     = 500
	MaxSingleRunes   = 2500
	maxActivePerUser = 3
)

var (
	ErrInvalid     = errors.New("invalid video request")
	ErrTooManyBusy = errors.New("too many videos in progress")
)

var aspectRatios = map[string]bool{"16:9": true, "9:16": true, "1:1": true}

// Scene is one shot: what to show and how long.
type Scene struct {
	Prompt  string
	Seconds int
}

// Request is one clip.
type Request struct {
	Scenes []Scene
	// ImageMediaID is a picture the user attached, used as the first frame.
	ImageMediaID string
	// AspectRatio is ignored when there is a picture: the clip follows it.
	AspectRatio string
	// Sound asks the model for speech, effects and ambience, which costs more.
	Sound bool
	// NotifyEmail sends the owner an email when the clip finishes.
	NotifyEmail bool
}

// TotalSeconds is the length of the clip, and what it is charged for.
func (r Request) TotalSeconds() int {
	total := 0
	for _, s := range r.Scenes {
		total += s.Seconds
	}
	return total
}

// Validate checks a request against the model's limits.
func (r Request) Validate() error {
	if len(r.Scenes) == 0 || len(r.Scenes) > MaxScenes {
		return fmt.Errorf("%w: a clip has 1 to %d scenes", ErrInvalid, MaxScenes)
	}
	total := r.TotalSeconds()
	if total < MinClipSeconds || total > MaxClipSeconds {
		return fmt.Errorf("%w: a clip runs %d to %d seconds, not %d", ErrInvalid, MinClipSeconds, MaxClipSeconds, total)
	}
	for i, s := range r.Scenes {
		runes := utf8.RuneCountInString(strings.TrimSpace(s.Prompt))
		limit := MaxShotRunes
		if len(r.Scenes) == 1 {
			limit = MaxSingleRunes
		}
		if runes == 0 || runes > limit {
			return fmt.Errorf("%w: scene %d needs a description of up to %d characters", ErrInvalid, i+1, limit)
		}
		if len(r.Scenes) > 1 && (s.Seconds < 1 || s.Seconds > MaxShotSeconds) {
			return fmt.Errorf("%w: scene %d must run 1 to %d seconds", ErrInvalid, i+1, MaxShotSeconds)
		}
	}
	if r.AspectRatio != "" && !aspectRatios[r.AspectRatio] {
		return fmt.Errorf("%w: unsupported aspect ratio", ErrInvalid)
	}
	if r.ImageMediaID != "" {
		if _, err := uuid.Parse(r.ImageMediaID); err != nil {
			return fmt.Errorf("%w: unknown picture", ErrInvalid)
		}
	}
	return nil
}

// ParseArgs reads a request from workflow step arguments, which arrive as
// decoded JSON. Unknown fields are refused so a plan cannot carry extras.
func ParseArgs(args map[string]any) (Request, error) {
	var r Request
	for name := range args {
		switch name {
		case "scenes", "image_media_id", "aspect_ratio", "sound", "notify_email":
		default:
			return Request{}, fmt.Errorf("%w: unknown argument %q", ErrInvalid, name)
		}
	}
	scenes, _ := args["scenes"].([]any)
	for _, raw := range scenes {
		m, ok := raw.(map[string]any)
		if !ok {
			return Request{}, fmt.Errorf("%w: a scene is malformed", ErrInvalid)
		}
		for name := range m {
			if name != "prompt" && name != "seconds" {
				return Request{}, fmt.Errorf("%w: unknown scene field %q", ErrInvalid, name)
			}
		}
		prompt, _ := m["prompt"].(string)
		seconds, ok := wholeSeconds(m["seconds"])
		if !ok {
			return Request{}, fmt.Errorf("%w: scene length must be whole seconds", ErrInvalid)
		}
		r.Scenes = append(r.Scenes, Scene{Prompt: strings.TrimSpace(prompt), Seconds: seconds})
	}
	r.ImageMediaID, _ = args["image_media_id"].(string)
	r.AspectRatio, _ = args["aspect_ratio"].(string)
	r.Sound, _ = args["sound"].(bool)
	r.NotifyEmail, _ = args["notify_email"].(bool)
	return r, r.Validate()
}

func wholeSeconds(v any) (int, bool) {
	switch n := v.(type) {
	case float64:
		if n == float64(int(n)) {
			return int(n), true
		}
	case int:
		return n, true
	}
	return 0, false
}

// Args is the reverse of ParseArgs: the arguments of a workflow step.
func (r Request) Args() map[string]any {
	scenes := make([]any, len(r.Scenes))
	for i, s := range r.Scenes {
		scenes[i] = map[string]any{"prompt": s.Prompt, "seconds": float64(s.Seconds)}
	}
	args := map[string]any{"scenes": scenes}
	if r.ImageMediaID != "" {
		args["image_media_id"] = r.ImageMediaID
	}
	if r.AspectRatio != "" {
		args["aspect_ratio"] = r.AspectRatio
	}
	if r.Sound {
		args["sound"] = true
	}
	if r.NotifyEmail {
		args["notify_email"] = true
	}
	return args
}

// Jobs is the part of the job service generation uses.
type Jobs interface {
	Create(ctx context.Context, userID, jobType string, input map[string]any, idempotencyKey string) (jobs.Job, bool, error)
	CountActive(ctx context.Context, userID, jobType string) (int, error)
}

type Service struct{ jobs Jobs }

func NewService(j Jobs) *Service { return &Service{jobs: j} }

// Submit queues one clip. Credits are held by the job service before anything
// runs, so a short balance fails here and nothing is queued.
func (s *Service) Submit(ctx context.Context, userID string, r Request, key string) (jobs.Job, bool, error) {
	if err := r.Validate(); err != nil {
		return jobs.Job{}, false, err
	}
	active, err := s.jobs.CountActive(ctx, userID, JobType)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if active >= maxActivePerUser {
		return jobs.Job{}, false, ErrTooManyBusy
	}
	return s.jobs.Create(ctx, userID, JobType, r.Args(), key)
}
