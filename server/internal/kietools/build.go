package kietools

import (
	"context"
	"errors"
	"mime"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/mediatime"
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
	data, mimeType, err := b.load(ctx, userID, s)
	if err != nil {
		return "", err
	}
	return b.Uploader.Upload(ctx, "input"+extensionFor(mimeType), mimeType, data)
}

// load reads a request's file, the user's own or a fetched link.
func (b Builder) load(ctx context.Context, userID string, s source) ([]byte, string, error) {
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
		if errors.Is(err, media.ErrNotFound) || errors.Is(err, media.ErrNotUploaded) || errors.Is(err, media.ErrTooLarge) || errors.Is(err, media.ErrUnsupported) {
			return nil, "", &transform.UserError{Message: "A file for this request could not be used. Attach it again."}
		}
		return nil, "", err
	}
	return data, mimeType, nil
}

// commonExtensions names uploads the way providers expect. The standard
// library's first guess is often an obscure alias (".m2a" for MP3, ".jfif"
// for JPEG), which a provider reading the extension can misread.
var commonExtensions = map[string]string{
	"audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav", "audio/aac": ".aac",
	"audio/mp4": ".m4a", "audio/ogg": ".ogg", "audio/webm": ".webm",
	"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
	"video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm",
}

func extensionFor(mimeType string) string {
	base, _, _ := mime.ParseMediaType(mimeType)
	if ext, ok := commonExtensions[base]; ok {
		return ext
	}
	if exts, _ := mime.ExtensionsByType(base); len(exts) > 0 {
		return exts[0]
	}
	return ""
}

var badRequest = &transform.UserError{Message: "That request was not valid. Please try again."}

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
	// The video lasts as long as the recording, and the provider bills for that.
	// The job was priced from the seconds the browser sent, so a recording that
	// plays longer is refused here, before anything is billed, and refunded.
	data, mimeType, err := b.load(ctx, job.UserID, req.Audio)
	if err != nil {
		return transform.Prepared{}, err
	}
	if played := audioSeconds(data, mimeType); played > float64(req.Seconds)+1 {
		return transform.Prepared{}, &transform.UserError{Message: "That recording is longer than the length you were charged for, so nothing was made and your credits were returned. Try again to see the right price."}
	}
	audio, err := b.Uploader.Upload(ctx, "input"+extensionFor(mimeType), mimeType, data)
	if err != nil {
		return transform.Prepared{}, err
	}
	return transform.Prepared{Model: ModelTalk, Input: map[string]any{"image_url": image, "audio_url": audio, "prompt": talkPrompt(req.Prompt)}}, nil
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
	return map[string]transform.Builder{JobTalk: b.BuildTalk, JobSpeech: b.BuildSpeech}
}

// audioSeconds reads how long a recording plays from its headers, or estimates
// it from its size at a low bit rate, so an unreadable file errs long.
func audioSeconds(data []byte, mimeType string) float64 {
	if seconds, ok := mediatime.Seconds(data, mimeType); ok {
		return seconds
	}
	return float64(len(data)) * 8 / assumedBitsPerSecond
}
