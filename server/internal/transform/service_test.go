package transform

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

func newService(r *rig) *Service {
	return NewService(r.service, fakeVideos{
		alice + "/vid-1": {ID: "vid-1", Platform: video.TikTok, SourceID: "7301", PageURL: "https://www.tiktok.com/@a/video/7301"},
	})
}

func TestSubmitQueuesJobFromOwnedVideoOnly(t *testing.T) {
	r := newRig(t)
	svc := newService(r)

	job, isNew, err := svc.Submit(ctx, alice, "vid-1", "  make it neon  ", "key-1")
	if err != nil || !isNew {
		t.Fatalf("%v new=%v", err, isNew)
	}
	if job.Status != jobs.StatusQueued || job.Type != JobType || job.UserID != alice ||
		job.Input["prompt"] != "make it neon" || job.Input["source_url"] != "https://www.tiktok.com/@a/video/7301" ||
		job.Input["resolution"] != "720p" || job.Input["video_id"] != "vid-1" {
		t.Fatalf("unexpected job %+v", job)
	}

	// Someone else's video is indistinguishable from a missing one.
	if _, _, err := svc.Submit(ctx, bob, "vid-1", "", ""); !errors.Is(err, ErrVideoNotFound) {
		t.Fatalf("expected ErrVideoNotFound, got %v", err)
	}
	if _, _, err := svc.Submit(ctx, alice, "missing", "", ""); !errors.Is(err, ErrVideoNotFound) {
		t.Fatalf("expected ErrVideoNotFound, got %v", err)
	}
}

func TestSubmitUsesDefaultPromptWhenOmitted(t *testing.T) {
	r := newRig(t)
	job, _, err := newService(r).Submit(ctx, alice, "vid-1", "   ", "")
	if err != nil || job.Input["prompt"] != defaultPrompt {
		t.Fatalf("%v %v", err, job.Input["prompt"])
	}
}

func TestSubmitIsIdempotent(t *testing.T) {
	r := newRig(t)
	svc := newService(r)
	first, _, _ := svc.Submit(ctx, alice, "vid-1", "x y", "same-key")
	again, isNew, err := svc.Submit(ctx, alice, "vid-1", "x y", "same-key")
	if err != nil || isNew || again.ID != first.ID {
		t.Fatalf("expected the original job: %+v new=%v %v", again, isNew, err)
	}
	if n, _ := r.jobs.CountActive(ctx, alice, JobType); n != 1 {
		t.Fatalf("expected one job, got %d", n)
	}
}

func TestSubmitValidatesInput(t *testing.T) {
	r := newRig(t)
	svc := newService(r)
	for name, tc := range map[string]struct{ prompt, key string }{
		"one char prompt":  {"a", ""},
		"huge prompt":      {strings.Repeat("a", maxPromptRunes+1), ""},
		"control chars":    {"hello\x00world", ""},
		"long key":         {"ok prompt", strings.Repeat("k", maxKeyLength+1)},
		"non-ascii key":    {"ok prompt", "kéy"},
		"control char key": {"ok prompt", "a\nb"},
	} {
		if _, _, err := svc.Submit(ctx, alice, "vid-1", tc.prompt, tc.key); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: expected ErrInvalid, got %v", name, err)
		}
	}
	if n, _ := r.jobs.CountActive(ctx, alice, JobType); n != 0 {
		t.Fatal("invalid requests must not create jobs")
	}
}

func TestSubmitCapsConcurrentJobsPerUser(t *testing.T) {
	r := newRig(t)
	svc := newService(r)
	for range maxActivePerUser {
		if _, _, err := svc.Submit(ctx, alice, "vid-1", "", ""); err != nil {
			t.Fatal(err)
		}
	}
	if _, _, err := svc.Submit(ctx, alice, "vid-1", "", ""); !errors.Is(err, ErrTooManyBusy) {
		t.Fatalf("expected ErrTooManyBusy, got %v", err)
	}
}

func TestAJobOfAnotherTypeIsPreparedByItsBuilderAndSubmittedToKIE(t *testing.T) {
	r := newRig(t)
	r.proc.Builders = map[string]Builder{
		"video_generate": func(_ context.Context, _ jobs.Job) (Prepared, error) {
			return Prepared{Model: "kling-3.0/video", Input: map[string]any{"prompt": "hi"}}, nil
		},
	}
	job, _, err := r.service.Create(context.Background(), alice, "video_generate", map[string]any{"x": 1}, "")
	if err != nil {
		t.Fatal(err)
	}
	r.proc.Handle(context.Background(), job)
	got := r.jobs.rows[job.ID]
	if got.ProviderTaskID == "" || got.Stage != "generating" || r.provider.lastModel != "kling-3.0/video" || r.provider.lastInput["prompt"] != "hi" {
		t.Fatalf("job=%+v model=%q input=%v", got, r.provider.lastModel, r.provider.lastInput)
	}
	if r.fetcher.got != "" {
		t.Fatal("a built job must not go through the transform fetch path")
	}
}

func TestABuilderUserErrorFailsTheJobWithItsMessageAndDoesNotRetry(t *testing.T) {
	r := newRig(t)
	r.proc.Builders = map[string]Builder{
		"video_generate": func(context.Context, jobs.Job) (Prepared, error) {
			return Prepared{}, &UserError{Message: "That picture could not be used. Attach it again."}
		},
	}
	job, _, _ := r.service.Create(context.Background(), alice, "video_generate", map[string]any{}, "")
	r.proc.Handle(context.Background(), job)
	got := r.jobs.rows[job.ID]
	if got.Status != jobs.StatusFailed || got.Error != "That picture could not be used. Attach it again." {
		t.Fatalf("job = %+v", got)
	}
}
