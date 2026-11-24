// Package videoedit changes a person's own video: their outfit, their
// background, the look of the place, while their face, movement and timing stay
// the ones they filmed. Made videos look generated because everything in them
// is invented; an edit keeps the real footage and changes only what was asked.
package videoedit

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
	"github.com/google/uuid"
)

// JobType is the type under which edits are stored and claimed.
const JobType = "video_edit"

// Model is Kling 3.0 Omni's transformation on KIE: one video in, the same video
// changed as the prompt says.
const Model = "kling-3.0-omni/transformation"

// Limits from the model's documentation, rounded inward.
const (
	MinSeconds       = 3.0
	MaxSeconds       = 15.0
	MaxPictures      = 4
	MaxPromptRunes   = 3000
	resolution       = "720p"
	maxActivePerUser = 2
)

var (
	ErrInvalid     = errors.New("invalid edit request")
	ErrTooManyBusy = errors.New("too many edits in progress")
	// ErrLength means the video is too short or too long to edit.
	ErrLength = errors.New("video length out of range")
)

// aspectRatios are the shapes the model takes when pictures come with the video.
var aspectRatios = map[string]bool{"9:16": true, "16:9": true, "1:1": true}

// Request is one edit.
type Request struct {
	VideoMediaID    string
	PictureMediaIDs []string
	Prompt          string
	// AspectRatio is needed only with pictures; without them the video keeps its shape.
	AspectRatio string
	// Seconds is how long the video plays, measured by the server when the edit
	// is submitted. The edit is priced by it.
	Seconds float64
}

// BilledSeconds is the whole seconds an edit is charged for.
func (r Request) BilledSeconds() int { return int(math.Ceil(r.Seconds)) }

// Validate checks a request against the model's limits.
func (r Request) Validate() error {
	if _, err := uuid.Parse(r.VideoMediaID); err != nil {
		return fmt.Errorf("%w: attach a video", ErrInvalid)
	}
	if len(r.PictureMediaIDs) > MaxPictures {
		return fmt.Errorf("%w: attach at most %d pictures", ErrInvalid, MaxPictures)
	}
	seen := map[string]bool{}
	for _, id := range r.PictureMediaIDs {
		if _, err := uuid.Parse(id); err != nil || seen[id] {
			return fmt.Errorf("%w: unknown picture", ErrInvalid)
		}
		seen[id] = true
	}
	runes := utf8.RuneCountInString(strings.TrimSpace(r.Prompt))
	if runes == 0 || runes > MaxPromptRunes {
		return fmt.Errorf("%w: describe the change in up to %d characters", ErrInvalid, MaxPromptRunes)
	}
	if len(r.PictureMediaIDs) > 0 && !aspectRatios[r.AspectRatio] {
		return fmt.Errorf("%w: choose the video's shape", ErrInvalid)
	}
	if r.Seconds != 0 && (r.Seconds < MinSeconds || r.Seconds > MaxSeconds+0.5) {
		return fmt.Errorf("%w: a video to edit plays %.0f to %.0f seconds", ErrLength, MinSeconds, MaxSeconds)
	}
	return nil
}

// ParseArgs reads a request from a job's stored input. Unknown fields are refused.
func ParseArgs(args map[string]any) (Request, error) {
	var r Request
	for name := range args {
		switch name {
		case "video_media_id", "picture_media_ids", "prompt", "aspect_ratio", "seconds":
		default:
			return Request{}, fmt.Errorf("%w: unknown argument %q", ErrInvalid, name)
		}
	}
	r.VideoMediaID, _ = args["video_media_id"].(string)
	if raw, ok := args["picture_media_ids"].([]any); ok {
		for _, v := range raw {
			id, ok := v.(string)
			if !ok {
				return Request{}, fmt.Errorf("%w: unknown picture", ErrInvalid)
			}
			r.PictureMediaIDs = append(r.PictureMediaIDs, id)
		}
	}
	r.Prompt, _ = args["prompt"].(string)
	r.Prompt = strings.TrimSpace(r.Prompt)
	r.AspectRatio, _ = args["aspect_ratio"].(string)
	r.Seconds, _ = args["seconds"].(float64)
	if r.Seconds == 0 {
		return Request{}, fmt.Errorf("%w: the video was not measured", ErrInvalid)
	}
	return r, r.Validate()
}

// Args is the reverse of ParseArgs.
func (r Request) Args() map[string]any {
	pictures := make([]any, len(r.PictureMediaIDs))
	for i, id := range r.PictureMediaIDs {
		pictures[i] = id
	}
	args := map[string]any{"video_media_id": r.VideoMediaID, "prompt": strings.TrimSpace(r.Prompt), "seconds": r.Seconds}
	if len(pictures) > 0 {
		args["picture_media_ids"] = pictures
		args["aspect_ratio"] = r.AspectRatio
	}
	return args
}

// Files is the part of the media service edits use. Every method refuses a
// file the user does not own.
type Files interface {
	MeasureVideo(ctx context.Context, userID, id string) (media.Item, float64, error)
	VideoLink(ctx context.Context, userID, id string) (media.VideoSource, error)
	PictureLinks(ctx context.Context, userID string, ids []string) ([]string, error)
}

// Jobs is the part of the job service edits use.
type Jobs interface {
	Create(ctx context.Context, userID, jobType string, input map[string]any, idempotencyKey string) (jobs.Job, bool, error)
	CountActive(ctx context.Context, userID, jobType string) (int, error)
}

type Service struct {
	jobs  Jobs
	files Files
}

func NewService(j Jobs, f Files) *Service { return &Service{jobs: j, files: f} }

// Measure returns how long a user's video plays, refusing one that cannot be edited.
func (s *Service) Measure(ctx context.Context, userID, videoID string) (float64, error) {
	if _, err := uuid.Parse(videoID); err != nil {
		return 0, fmt.Errorf("%w: attach a video", ErrInvalid)
	}
	_, seconds, err := s.files.MeasureVideo(ctx, userID, videoID)
	if err != nil {
		return 0, err
	}
	if seconds < MinSeconds || seconds > MaxSeconds+0.5 {
		return seconds, fmt.Errorf("%w: a video to edit plays %.0f to %.0f seconds, this one plays %.1f", ErrLength, MinSeconds, MaxSeconds, seconds)
	}
	return seconds, nil
}

// Submit measures the video and queues the edit. Credits are held by the job
// service before anything runs, so a short balance fails here and nothing is queued.
func (s *Service) Submit(ctx context.Context, userID string, r Request, key string) (jobs.Job, bool, error) {
	r.Seconds = 0
	if err := r.Validate(); err != nil {
		return jobs.Job{}, false, err
	}
	seconds, err := s.Measure(ctx, userID, r.VideoMediaID)
	if err != nil {
		return jobs.Job{}, false, err
	}
	r.Seconds = seconds
	active, err := s.jobs.CountActive(ctx, userID, JobType)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if active >= maxActivePerUser {
		return jobs.Job{}, false, ErrTooManyBusy
	}
	return s.jobs.Create(ctx, userID, JobType, r.Args(), key)
}

// editRules is added to every edit so the model changes only what was asked.
const editRules = " Keep the same person with the same face, expressions, mouth movements, body movements and timing as in the original video. Change only what is described above. Keep it looking like real footage filmed on a phone: natural skin texture, real fabric with folds, light that matches the scene, no glossy or airbrushed look, no text or logos."

// Builder turns a stored edit into a KIE task.
type Builder struct{ Files Files }

// Build implements transform.Builder. Links are made now, not when the edit was
// submitted, so a job that waited in the queue still hands over fresh ones.
func (b Builder) Build(ctx context.Context, job jobs.Job) (transform.Prepared, error) {
	req, err := ParseArgs(job.Input)
	if err != nil {
		return transform.Prepared{}, &transform.UserError{Message: "That edit request was not valid. Please try again."}
	}
	source, err := b.Files.VideoLink(ctx, job.UserID, req.VideoMediaID)
	if isFileProblem(err) {
		return transform.Prepared{}, &transform.UserError{Message: "Your video could not be used. Upload it again as an MP4 or MOV file."}
	}
	if err != nil {
		return transform.Prepared{}, err
	}
	prompt := clip(req.Prompt, MaxPromptRunes-utf8.RuneCountInString(editRules)) + editRules
	input := map[string]any{
		"prompt":     prompt,
		"video_urls": []string{source.URL},
		"resolution": resolution,
		"audio":      false,
	}
	if len(req.PictureMediaIDs) > 0 {
		links, err := b.Files.PictureLinks(ctx, job.UserID, req.PictureMediaIDs)
		if isFileProblem(err) {
			return transform.Prepared{}, &transform.UserError{Message: "A picture could not be used. Attach JPG or PNG pictures and try again."}
		}
		if err != nil {
			return transform.Prepared{}, err
		}
		input["image_urls"] = links
		input["aspect_ratio"] = req.AspectRatio
	} else {
		input["aspect_ratio"] = "auto"
	}
	return transform.Prepared{Model: Model, Input: input}, nil
}

func isFileProblem(err error) bool {
	return errors.Is(err, media.ErrNotFound) || errors.Is(err, media.ErrNotUploaded) || errors.Is(err, media.ErrTooLarge) ||
		errors.Is(err, media.ErrUnsupported) || errors.Is(err, media.ErrCannotMeasure)
}

// clip cuts to at most n characters without splitting one.
func clip(s string, n int) string {
	s = strings.TrimSpace(s)
	if n <= 0 {
		return ""
	}
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	return strings.TrimSpace(string([]rune(s)[:n]))
}

// Keeper copies a finished edit into the user's storage with the sound of their
// original video laid under it.
type Keeper interface {
	AdoptWithSound(ctx context.Context, userID, jobID, sourceURL, originalID, name string, mix media.Mixer) (media.Descriptor, bool, error)
}

// Finisher gives a finished edit back its sound: the model returns the changed
// picture silent, and the person's own voice is what makes it theirs. Without a
// mixer (ffmpeg missing) it does nothing and the edit stays silent.
type Finisher struct {
	Files Keeper
	Mix   media.Mixer
}

// Finish implements transform.Finisher.
func (f Finisher) Finish(ctx context.Context, job jobs.Job, urls []string) error {
	if f.Mix == nil || f.Files == nil {
		return nil
	}
	req, err := ParseArgs(job.Input)
	if err != nil {
		return err
	}
	_, sound, err := f.Files.AdoptWithSound(ctx, job.UserID, job.ID, urls[0], req.VideoMediaID, clip(req.Prompt, 80), f.Mix)
	if err == nil && !sound {
		return errors.New("the edit was kept without its sound")
	}
	return err
}
