package generate

import (
	"context"
	"errors"
	"strconv"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
)

// Pictures go to KIE as files it hosts, the same way transformations send video.
type Uploader interface {
	Upload(ctx context.Context, fileName, mimeType string, data []byte) (string, error)
}

// Pictures reads a picture the user attached, refusing anyone else's.
type Pictures interface {
	Load(ctx context.Context, userID, id string, max int64) ([]byte, string, error)
}

// Builder turns a stored request into a Kling 3.0 task.
type Builder struct {
	Pictures Pictures
	Uploader Uploader
}

const mode = "std"

// Build implements transform.Builder.
func (b Builder) Build(ctx context.Context, job jobs.Job) (transform.Prepared, error) {
	req, err := ParseArgs(job.Input)
	if err != nil {
		return transform.Prepared{}, &transform.UserError{Message: "That video request was not valid. Please try again."}
	}
	input := map[string]any{
		"sound":    req.Sound,
		"mode":     mode,
		"duration": strconv.Itoa(req.TotalSeconds()),
	}
	if len(req.Scenes) == 1 {
		input["multi_shots"] = false
		input["prompt"] = req.Scenes[0].Prompt
	} else {
		shots := make([]map[string]any, len(req.Scenes))
		for i, s := range req.Scenes {
			shots[i] = map[string]any{"prompt": s.Prompt, "duration": s.Seconds}
		}
		input["multi_shots"] = true
		input["multi_prompt"] = shots
	}
	if req.ImageMediaID != "" {
		url, err := b.uploadPicture(ctx, job.UserID, req.ImageMediaID)
		if errors.Is(err, media.ErrNotFound) || errors.Is(err, media.ErrNotUploaded) || errors.Is(err, media.ErrTooLarge) {
			return transform.Prepared{}, &transform.UserError{Message: "That picture could not be used. Attach it again."}
		}
		if err != nil {
			return transform.Prepared{}, err
		}
		// With a picture the clip follows its shape, so no aspect ratio is sent.
		input["image_urls"] = []string{url}
	} else {
		ratio := req.AspectRatio
		if ratio == "" {
			ratio = "9:16" // social video is vertical by default
		}
		input["aspect_ratio"] = ratio
	}
	return transform.Prepared{Model: Model, Input: input}, nil
}

func (b Builder) uploadPicture(ctx context.Context, userID, id string) (string, error) {
	data, mime, err := b.Pictures.Load(ctx, userID, id, kie.MaxInputBytes)
	if err != nil {
		return "", err
	}
	return b.Uploader.Upload(ctx, id+extension(mime), mime, data)
}

func extension(mime string) string {
	switch mime {
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	}
	return ".jpg"
}
