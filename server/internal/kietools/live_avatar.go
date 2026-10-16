package kietools

import (
	"context"
	"strings"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/assets"
	"github.com/Ferousco-dev/beyond-social/server/internal/elevenlabs"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
)

// LiveAvatarInput binds a script to one consented asset group and its cloned voice.
type LiveAvatarInput struct {
	GroupID, VoiceID, Script, Prompt, IdempotencyKey string
}

type AssetGroups interface {
	Detail(ctx context.Context, userID, id string) (assets.GroupDetail, error)
}

type VoiceAccess interface {
	Allowed(ctx context.Context, userID, voiceID string) error
}

type LiveAvatarService struct {
	jobs   Jobs
	groups AssetGroups
	voices VoiceAccess
}

func NewLiveAvatarService(j Jobs, groups AssetGroups, voices VoiceAccess) *LiveAvatarService {
	return &LiveAvatarService{jobs: j, groups: groups, voices: voices}
}

func (s *LiveAvatarService) Submit(ctx context.Context, userID string, in LiveAvatarInput) (jobs.Job, bool, error) {
	in.GroupID, in.VoiceID, in.Script, in.Prompt = strings.TrimSpace(in.GroupID), strings.TrimSpace(in.VoiceID), strings.TrimSpace(in.Script), strings.TrimSpace(in.Prompt)
	if in.GroupID == "" || in.VoiceID == "" || in.Script == "" || utf8.RuneCountInString(in.Script) > MaxSpeechRunes || utf8.RuneCountInString(in.Prompt) > MaxPromptRunes {
		return jobs.Job{}, false, ErrInvalid
	}
	group, err := s.groups.Detail(ctx, userID, in.GroupID)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if group.FaceConsent == nil || group.VoiceConsent == nil || group.Face == nil || group.Face.Kind != "image" {
		return jobs.Job{}, false, ErrInvalid
	}
	if err := s.voices.Allowed(ctx, userID, in.VoiceID); err != nil {
		return jobs.Job{}, false, err
	}
	active, err := s.jobs.CountActive(ctx, userID, JobLiveAvatar)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if active >= maxActivePerUser {
		return jobs.Job{}, false, ErrTooManyBusy
	}
	return s.jobs.Create(ctx, userID, JobLiveAvatar, map[string]any{"group_id": in.GroupID, "voice_id": in.VoiceID, "script": in.Script, "prompt": in.Prompt}, in.IdempotencyKey)
}

type Speaker interface {
	Speak(ctx context.Context, voiceID, model, text string) ([]byte, error)
}

type LiveAvatarBuilder struct {
	Builder
	Groups  AssetGroups
	Speaker Speaker
}

// BuildLiveAvatar creates speech first, then asks KIE to make one lip-synced video from it.
func (b LiveAvatarBuilder) BuildLiveAvatar(ctx context.Context, job jobs.Job) (transform.Prepared, error) {
	groupID, voiceID, script, prompt := str(job.Input, "group_id"), str(job.Input, "voice_id"), str(job.Input, "script"), str(job.Input, "prompt")
	group, err := b.Groups.Detail(ctx, job.UserID, groupID)
	if err != nil || group.FaceConsent == nil || group.VoiceConsent == nil || group.Face == nil || group.Face.Kind != "image" {
		return transform.Prepared{}, badRequest
	}
	image, err := b.hosted(ctx, job.UserID, source{MediaID: group.Face.MediaID})
	if err != nil {
		return transform.Prepared{}, err
	}
	audio, err := b.Speaker.Speak(ctx, voiceID, elevenlabs.DefaultModel, script)
	if err != nil {
		return transform.Prepared{}, err
	}
	audioURL, err := b.Uploader.Upload(ctx, "avatar-speech.mp3", "audio/mpeg", audio)
	if err != nil {
		return transform.Prepared{}, err
	}
	return transform.Prepared{Model: ModelTalk, Input: map[string]any{"image_url": image, "audio_url": audioURL, "prompt": prompt}}, nil
}

func str(input map[string]any, key string) string { value, _ := input[key].(string); return value }
