// Package kietools holds the media tools that run on KIE besides video
// generation: editing a picture, making a picture talk, and speaking text. Each
// is a job claimed by the same worker that follows every KIE task.
package kietools

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/google/uuid"
)

// Job types, under which each tool's work is stored and claimed.
const (
	JobTalk       = "talking_photo"
	JobSpeech     = "speech"
	JobLiveAvatar = "live_avatar"
)

// KIE models. The talking photo is Kling's Pro avatar model (1080p; the
// Standard tier is 720p and looks more synthetic), and speech is ElevenLabs
// with its ready-made voices.
const (
	ModelTalk   = "kling/ai-avatar-pro"
	ModelSpeech = "elevenlabs/text-to-speech-multilingual-v2"
)

// realLook is added to every talking-photo direction. The avatar model drifts
// toward a stiff, over-animated face when it is given nothing; this keeps the
// person looking like someone filmed, and the person's own direction comes first.
const realLook = "Keep the person exactly as in the photo: same face, skin, hair and clothes. Natural, restrained delivery like a real video call or phone clip: relaxed shoulders, small head movements, blinks at an irregular pace, brief glances away, eyebrows and mouth moving only as much as the words need. Real skin texture with pores and slight shine, no smoothing. Ordinary available light and the original background unchanged. No exaggerated expressions, no dramatic gestures, no text or logos."

// talkPrompt is the direction sent to the avatar model: the person's words,
// then the look of real footage.
func talkPrompt(direction string) string {
	direction = strings.TrimSpace(direction)
	if direction == "" {
		return realLook
	}
	return direction + " " + realLook
}

// ResultKeys names where each job type's finished file is stored in its result.
var ResultKeys = map[string]string{JobTalk: "video_url", JobSpeech: "audio_url"}

const (
	MaxPictures      = 4
	MaxPromptRunes   = 2000
	MaxSpeechRunes   = 5000
	MinTalkSeconds   = 1
	MaxTalkSeconds   = 60
	maxActivePerUser = 3
	maxURLRunes      = 2000
)

var (
	ErrInvalid     = errors.New("invalid media request")
	ErrTooManyBusy = errors.New("too many media jobs in progress")
)

// DefaultVoice is Daniel, one of KIE's ready-made voices, confirmed with a live
// request on 19 Nov 2026. Voices are never cloned. The earlier default (James,
// EkK5I93UQWFDigLMpZcX) is rejected by KIE on this account.
const DefaultVoice = "onwK4e9ZLuTAKqWW03F9"

// Voices are the ready-made voices confirmed to work with a live request. KIE
// takes ids from a list of 83, so a voice is added here only after a real test,
// never guessed. The client picker (generate-form/voices.ts) lists the same ids.
var Voices = []string{
	DefaultVoice,
	"EXAVITQu4vr4xnSDxMaL", // Sarah
	"JBFqnCBsd6RMkjVDRZzb", // George
	"cgSgspJ2msm6clMCkdW9", // Jessica
	"TX3LPaxmHKxFdv7VOQHJ", // Liam
}

// KnownVoice reports whether a voice id has been confirmed to work.
func KnownVoice(id string) bool {
	for _, v := range Voices {
		if v == id {
			return true
		}
	}
	return false
}

func invalid(format string, a ...any) error {
	return fmt.Errorf("%w: %s", ErrInvalid, fmt.Sprintf(format, a...))
}

// checkArgs refuses any argument a tool does not take.
func checkArgs(args map[string]any, allowed ...string) error {
	for name := range args {
		known := false
		for _, a := range allowed {
			known = known || a == name
		}
		if !known {
			return invalid("unknown argument %q", name)
		}
	}
	return nil
}

func text(args map[string]any, name string, max int, required bool) (string, error) {
	v, present := args[name]
	if !present {
		if required {
			return "", invalid("%s is required", name)
		}
		return "", nil
	}
	s, ok := v.(string)
	s = strings.TrimSpace(s)
	if !ok || (required && s == "") || utf8.RuneCountInString(s) > max {
		return "", invalid("%s must be text of up to %d characters", name, max)
	}
	return s, nil
}

func mediaID(args map[string]any, name string) (string, error) {
	id, err := text(args, name, 64, false)
	if err == nil && id != "" {
		if _, perr := uuid.Parse(id); perr != nil {
			return "", invalid("%s is not a known file", name)
		}
	}
	return id, err
}

func httpsURL(args map[string]any, name string) (string, error) {
	raw, err := text(args, name, maxURLRunes, false)
	if err != nil || raw == "" {
		return "", err
	}
	u, perr := url.Parse(raw)
	if perr != nil || u.Scheme != "https" || u.Host == "" {
		return "", invalid("%s must be an https link", name)
	}
	return raw, nil
}

// source is a file given either as one the user attached or as a link, which is
// how the output of an earlier step arrives.
type source struct{ MediaID, URL string }

func (s source) empty() bool { return s.MediaID == "" && s.URL == "" }

func readSource(args map[string]any, idName, urlName string) (source, error) {
	id, err := mediaID(args, idName)
	if err != nil {
		return source{}, err
	}
	link, err := httpsURL(args, urlName)
	if err != nil {
		return source{}, err
	}
	if id != "" && link != "" {
		return source{}, invalid("give %s or %s, not both", idName, urlName)
	}
	return source{MediaID: id, URL: link}, nil
}

// Jobs is the part of the job service these tools use.
type Jobs interface {
	Create(ctx context.Context, userID, jobType string, input map[string]any, idempotencyKey string) (jobs.Job, bool, error)
	CountActive(ctx context.Context, userID, jobType string) (int, error)
}

type Service struct{ jobs Jobs }

func NewService(j Jobs) *Service { return &Service{jobs: j} }

// Submit queues a job from already validated arguments. Credits are held by the
// job service first, so a short balance fails here and nothing is queued.
func (s *Service) Submit(ctx context.Context, userID, jobType string, args map[string]any, key string) (jobs.Job, bool, error) {
	active, err := s.jobs.CountActive(ctx, userID, jobType)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if active >= maxActivePerUser {
		return jobs.Job{}, false, ErrTooManyBusy
	}
	return s.jobs.Create(ctx, userID, jobType, args, key)
}
