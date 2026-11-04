package kietools

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/Ferousco-dev/beyond-social/server/internal/assets"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
)

// LiveAvatarInput binds scene direction and script to a consented face and
// voice recording: library assets picked one by one, or an older asset group.
type LiveAvatarInput struct {
	FaceAssetID, VoiceAssetID      string
	GroupID                        string
	Script, Prompt, IdempotencyKey string
}

// AssetLibrary reads library assets for a video. *assetlib.Service satisfies it.
type AssetLibrary interface {
	Usable(ctx context.Context, userID, id string, kind assetlib.Kind) (assetlib.Asset, error)
}

type AssetGroups interface {
	Detail(ctx context.Context, userID, id string) (assets.GroupDetail, error)
}

// LiveAvatarService checks a face and a voice recording and queues the lip-sync.
// The recording becomes the video's audio as it is: nothing is cloned or
// re-voiced, so the video lasts as long as the recording and is priced by it.
type LiveAvatarService struct {
	jobs    Jobs
	groups  AssetGroups
	library AssetLibrary
	files   Files
}

func NewLiveAvatarService(j Jobs, groups AssetGroups, library AssetLibrary, files Files) *LiveAvatarService {
	return &LiveAvatarService{jobs: j, groups: groups, library: library, files: files}
}

// pair is a checked face picture and voice recording, ready to lip-sync.
type pair struct{ face, voice string }

func (s *LiveAvatarService) Submit(ctx context.Context, userID string, in LiveAvatarInput) (jobs.Job, bool, error) {
	in.Script, in.Prompt = strings.TrimSpace(in.Script), strings.TrimSpace(in.Prompt)
	if in.Script == "" || utf8.RuneCountInString(in.Script) > MaxSpeechRunes || utf8.RuneCountInString(in.Prompt) > MaxPromptRunes {
		return jobs.Job{}, false, ErrInvalid
	}
	var (
		chosen pair
		err    error
	)
	if in.FaceAssetID != "" {
		chosen, err = s.fromLibrary(ctx, userID, in.FaceAssetID, in.VoiceAssetID)
	} else {
		chosen, err = s.fromGroup(ctx, userID, strings.TrimSpace(in.GroupID))
	}
	if err != nil {
		return jobs.Job{}, false, err
	}
	input, err := s.input(ctx, userID, chosen, in.Script, in.Prompt)
	if err != nil {
		return jobs.Job{}, false, err
	}
	return s.create(ctx, userID, input, in.IdempotencyKey)
}

// fromLibrary checks a face and voice picked from the library: the person's
// own, consented, and of the kinds the lip-sync model reads.
func (s *LiveAvatarService) fromLibrary(ctx context.Context, userID, faceID, voiceID string) (pair, error) {
	if s.library == nil || voiceID == "" {
		return pair{}, ErrInvalid
	}
	face, err := s.library.Usable(ctx, userID, faceID, assetlib.KindFace)
	if err != nil {
		return pair{}, libraryErr(err)
	}
	voice, err := s.library.Usable(ctx, userID, voiceID, assetlib.KindVoice)
	if err != nil {
		return pair{}, libraryErr(err)
	}
	if face.FileKind != "image" || voice.FileKind != "audio" {
		return pair{}, ErrInvalid
	}
	return pair{face: face.MediaID, voice: voice.MediaID}, nil
}

// fromGroup reads the face and voice an older asset group holds.
func (s *LiveAvatarService) fromGroup(ctx context.Context, userID, groupID string) (pair, error) {
	if groupID == "" {
		return pair{}, ErrInvalid
	}
	group, err := s.groups.Detail(ctx, userID, groupID)
	if err != nil {
		return pair{}, err
	}
	if group.FaceConsent == nil || group.VoiceConsent == nil || group.Face == nil || group.Face.Kind != "image" || group.Voice == nil {
		return pair{}, ErrInvalid
	}
	return pair{face: group.Face.MediaID, voice: group.Voice.MediaID}, nil
}

// input is what the job stores, including the recording's length in whole
// seconds, which is what the video lasts and what it is charged for.
func (s *LiveAvatarService) input(ctx context.Context, userID string, chosen pair, script, prompt string) (map[string]any, error) {
	seconds, err := s.recordingSeconds(ctx, userID, chosen.voice)
	if err != nil {
		return nil, err
	}
	return map[string]any{"face_media_id": chosen.face, "voice_media_id": chosen.voice, "seconds": seconds, "script": script, "prompt": prompt}, nil
}

func (s *LiveAvatarService) create(ctx context.Context, userID string, input map[string]any, key string) (jobs.Job, bool, error) {
	active, err := s.jobs.CountActive(ctx, userID, JobLiveAvatar)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if active >= maxActivePerUser {
		return jobs.Job{}, false, ErrTooManyBusy
	}
	return s.jobs.Create(ctx, userID, JobLiveAvatar, input, key)
}

// libraryErr reads a refused or missing asset as a bad request; anything else
// (a storage outage) passes through.
func libraryErr(err error) error {
	if errors.Is(err, assetlib.ErrInvalid) || errors.Is(err, assetlib.ErrNotFound) {
		return errors.Join(ErrInvalid, err)
	}
	return err
}

type LiveAvatarBuilder struct {
	Builder
}

// BuildLiveAvatar lip-syncs the face picture to the voice recording with KIE's
// Kling avatar model; both were checked for consent when the job was submitted.
func (b LiveAvatarBuilder) BuildLiveAvatar(ctx context.Context, job jobs.Job) (transform.Prepared, error) {
	face, voice, prompt := str(job.Input, "face_media_id"), str(job.Input, "voice_media_id"), str(job.Input, "prompt")
	if face == "" || voice == "" {
		return transform.Prepared{}, badRequest
	}
	image, err := b.hosted(ctx, job.UserID, source{MediaID: face})
	if err != nil {
		return transform.Prepared{}, err
	}
	audioURL, err := b.hosted(ctx, job.UserID, source{MediaID: voice})
	if err != nil {
		return transform.Prepared{}, err
	}
	return transform.Prepared{Model: ModelTalk, Input: map[string]any{"image_url": image, "audio_url": audioURL, "prompt": prompt}}, nil
}

func str(input map[string]any, key string) string { value, _ := input[key].(string); return value }
