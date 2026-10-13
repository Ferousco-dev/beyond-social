package kietools

import (
	"context"
	"errors"
	"mime"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
)

// Uploader hosts a file at KIE, which only accepts files it hosts.
type Uploader interface {
	Upload(ctx context.Context, fileName, mimeType string, data []byte) (string, error)
}

// Files reads a file the user attached, refusing anyone else's.
type Files interface {
	Load(ctx context.Context, userID, id string, max int64) ([]byte, string, error)
}

// Fetcher downloads a link, such as the output of an earlier step, with the
// same size and address limits as every other download.
type Fetcher interface {
	Fetch(ctx context.Context, rawURL string, maxBytes int64) ([]byte, error)
}

// Builder turns a stored request into a KIE task.
type Builder struct {
	Files    Files
	Fetcher  Fetcher
	Uploader Uploader
}

func (b Builder) hosted(ctx context.Context, userID string, s source) (string, error) {
	var data []byte
	var mimeType string
	var err error
	if s.MediaID != "" {
		data, mimeType, err = b.Files.Load(ctx, userID, s.MediaID, kie.MaxInputBytes)
	} else {
		data, err = b.Fetcher.Fetch(ctx, s.URL, kie.MaxInputBytes)
		mimeType = http.DetectContentType(data)
	}
	if err != nil {
		if errors.Is(err, media.ErrNotFound) || errors.Is(err, media.ErrNotUploaded) || errors.Is(err, media.ErrTooLarge) {
			return "", &transform.UserError{Message: "A file for this request could not be used. Attach it again."}
		}
		return "", err
	}
	name := "input"
	if exts, _ := mime.ExtensionsByType(mimeType); len(exts) > 0 {
		name += exts[0]
	}
	return b.Uploader.Upload(ctx, name, mimeType, data)
}

var badRequest = &transform.UserError{Message: "That request was not valid. Please try again."}

// BuildEdit implements transform.Builder for picture edits.
func (b Builder) BuildEdit(ctx context.Context, job jobs.Job) (transform.Prepared, error) {
	req, err := ParseEdit(job.Input)
	if err != nil {
		return transform.Prepared{}, badRequest
	}
	urls := make([]string, len(req.Pictures))
	for i, p := range req.Pictures {
		if urls[i], err = b.hosted(ctx, job.UserID, p); err != nil {
			return transform.Prepared{}, err
		}
	}
	input := map[string]any{"prompt": req.Prompt, "image_urls": urls}
	if req.AspectRatio != "" {
		input["aspect_ratio"] = req.AspectRatio
	}
	return transform.Prepared{Model: ModelEdit, Input: input}, nil
}

// BuildTalk implements transform.Builder for talking photos.
func (b Builder) BuildTalk(ctx context.Context, job jobs.Job) (transform.Prepared, error) {
	req, err := ParseTalk(job.Input)
	if err != nil {
		return transform.Prepared{}, badRequest
	}
	image, err := b.hosted(ctx, job.UserID, req.Image)
	if err != nil {
		return transform.Prepared{}, err
	}
	audio, err := b.hosted(ctx, job.UserID, req.Audio)
	if err != nil {
		return transform.Prepared{}, err
	}
	return transform.Prepared{Model: ModelTalk, Input: map[string]any{"image_url": image, "audio_url": audio, "prompt": req.Prompt}}, nil
}

// BuildSpeech implements transform.Builder for spoken text.
func (b Builder) BuildSpeech(_ context.Context, job jobs.Job) (transform.Prepared, error) {
	req, err := ParseSpeech(job.Input)
	if err != nil {
		return transform.Prepared{}, badRequest
	}
	voice := req.Voice
	if voice == "" {
		voice = DefaultVoice
	}
	return transform.Prepared{Model: ModelSpeech, Input: map[string]any{"text": req.Text, "voice": voice}}, nil
}

// Builders registers all three with the KIE processor.
func (b Builder) Builders() map[string]transform.Builder {
	return map[string]transform.Builder{JobEdit: b.BuildEdit, JobTalk: b.BuildTalk, JobSpeech: b.BuildSpeech}
}
