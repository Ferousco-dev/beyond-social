package avatarvideo

import (
	"context"
	"errors"
	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs/jobstest"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
)

const (
	alice = "6f1c5a0e-7a53-4d0e-9f56-0a3f6a1b2c3d"
	bob   = "0b5d3c1a-2d4e-4f60-8a71-92b3c4d5e6f7"
)

var ctx = context.Background()

type fakeAvatars map[string]avatars.Avatar // key: userID/avatarID

func (f fakeAvatars) Get(_ context.Context, userID, id string) (avatars.Avatar, error) {
	if a, ok := f[userID+"/"+id]; ok {
		return a, nil
	}
	return avatars.Avatar{}, avatars.ErrNotFound
}

type voiceCheck map[string]bool

func (v voiceCheck) Allowed(_ context.Context, _ string, id string) error {
	if v[id] {
		return nil
	}
	return voices.ErrNotAllowed
}

type fakeProvider struct {
	createErr, getErr error
	video             heygen.Video
	creates           int
	lastReq           heygen.VideoRequest
	lastKey           string
}

func (f *fakeProvider) CreateVideo(_ context.Context, r heygen.VideoRequest, key string) (string, error) {
	f.creates++
	f.lastReq, f.lastKey = r, key
	if f.createErr != nil {
		return "", f.createErr
	}
	return "v_1", nil
}

func (f *fakeProvider) GetVideo(context.Context, string) (heygen.Video, error) {
	return f.video, f.getErr
}

type recorder struct {
	mu    sync.Mutex
	users []string
}

func (r *recorder) Publish(userID string, _ realtime.Event) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.users = append(r.users, userID)
}

type rig struct {
	repo     *jobstest.Repo
	events   *recorder
	provider *fakeProvider
	svc      *Service
	proc     *Processor
}

func newRig() *rig {
	r := &rig{repo: jobstest.New(), events: &recorder{}, provider: &fakeProvider{}}
	jobService := jobs.NewService(r.repo, r.events)
	ready := avatars.Avatar{ID: "11111111-1111-4111-8111-111111111111", UserID: alice, Status: avatars.StatusReady, LookID: "look-1", VoiceID: "voice-own"}
	training := avatars.Avatar{ID: "22222222-2222-4222-8222-222222222222", UserID: alice, Status: avatars.StatusTraining}
	av := fakeAvatars{alice + "/" + ready.ID: ready, alice + "/" + training.ID: training}
	r.svc = NewService(jobService, av, voiceCheck{"voice-own": true, "lib-voice": true})
	r.proc = &Processor{Jobs: jobService, Avatars: av, Provider: r.provider, CallbackURL: "https://api.example/api/v1/callbacks/heygen"}
	return r
}

const readyAvatar = "11111111-1111-4111-8111-111111111111"

func (r *rig) queued(t *testing.T) jobs.Job {
	t.Helper()
	j, _, err := r.svc.Submit(ctx, alice, SubmitInput{AvatarID: readyAvatar, Script: "Hello world"})
	if err != nil {
		t.Fatal(err)
	}
	return j
}

func TestSubmitQueuesJobWithoutProviderIDs(t *testing.T) {
	r := newRig()
	job, isNew, err := r.svc.Submit(ctx, alice, SubmitInput{AvatarID: readyAvatar, Script: "  Hello world\nsecond line  ", VoiceID: "lib-voice", IdempotencyKey: "k1"})
	if err != nil || !isNew {
		t.Fatalf("%v new=%v", err, isNew)
	}
	if job.Status != jobs.StatusQueued || job.Type != JobType || job.UserID != alice || job.Input["avatar_id"] != readyAvatar ||
		job.Input["voice_id"] != "lib-voice" || job.Input["script"] != "Hello world\nsecond line" || job.Input["title"] != "Hello world" {
		t.Fatalf("unexpected job %+v", job)
	}
	if _, leaked := job.Input["look_id"]; leaked {
		t.Fatal("provider look IDs must not be stored in the job input shown to the user")
	}
	if r.provider.creates != 0 {
		t.Fatal("submitting must not call HeyGen inline")
	}

	again, isNew, err := r.svc.Submit(ctx, alice, SubmitInput{AvatarID: readyAvatar, Script: "Hello world", IdempotencyKey: "k1"})
	if err != nil || isNew || again.ID != job.ID || r.repo.Count() != 1 {
		t.Fatalf("an idempotent repeat must return the original: %+v new=%v", again, isNew)
	}
}

func TestSubmitDefaultsToTheAvatarsVoice(t *testing.T) {
	r := newRig()
	if job := r.queued(t); job.Input["voice_id"] != "voice-own" {
		t.Fatalf("got %v", job.Input["voice_id"])
	}
}

func TestSubmitValidation(t *testing.T) {
	r := newRig()
	cases := map[string]struct {
		user string
		in   SubmitInput
		want error
	}{
		"empty script":       {alice, SubmitInput{AvatarID: readyAvatar, Script: "  "}, ErrInvalid},
		"huge script":        {alice, SubmitInput{AvatarID: readyAvatar, Script: strings.Repeat("a", maxScriptRunes+1)}, ErrInvalid},
		"control characters": {alice, SubmitInput{AvatarID: readyAvatar, Script: "hi\x00there"}, ErrInvalid},
		"bad key":            {alice, SubmitInput{AvatarID: readyAvatar, Script: "hi", IdempotencyKey: "a\nb"}, ErrInvalid},
		"unknown avatar":     {alice, SubmitInput{AvatarID: "33333333-3333-4333-8333-333333333333", Script: "hi"}, ErrAvatarNotFound},
		"someone else's":     {bob, SubmitInput{AvatarID: readyAvatar, Script: "hi"}, ErrAvatarNotFound},
		"avatar training":    {alice, SubmitInput{AvatarID: "22222222-2222-4222-8222-222222222222", Script: "hi"}, ErrAvatarNotReady},
		"foreign voice":      {alice, SubmitInput{AvatarID: readyAvatar, Script: "hi", VoiceID: "bobs-voice"}, ErrVoiceNotAllowed},
	}
	for name, tc := range cases {
		if _, _, err := r.svc.Submit(ctx, tc.user, tc.in); !errors.Is(err, tc.want) {
			t.Errorf("%s: expected %v, got %v", name, tc.want, err)
		}
	}
	if r.repo.Count() != 0 {
		t.Fatal("rejected requests must not create jobs")
	}
}

func TestSubmitCapsActiveVideos(t *testing.T) {
	r := newRig()
	for range maxActivePerUser {
		r.queued(t)
	}
	if _, _, err := r.svc.Submit(ctx, alice, SubmitInput{AvatarID: readyAvatar, Script: "one more"}); !errors.Is(err, ErrTooManyBusy) {
		t.Fatalf("got %v", err)
	}
}

func TestHappyPathCompletesOnlyOnProviderConfirmation(t *testing.T) {
	r := newRig()
	job := r.queued(t)

	r.proc.Handle(ctx, job)
	got := r.repo.Job(job.ID)
	if got.Status != jobs.StatusRunning || got.Stage != stageGenerating || got.ProviderTaskID != "v_1" || got.NextRunAt == nil {
		t.Fatalf("after submit: %+v", got)
	}
	req := r.provider.lastReq
	if req.AvatarID != "look-1" || req.VoiceID != "voice-own" || req.Script != "Hello world" || req.CallbackID != job.ID ||
		req.CallbackURL != "https://api.example/api/v1/callbacks/heygen" || r.provider.lastKey != "job-"+job.ID {
		t.Fatalf("unexpected provider request %+v key=%q", req, r.provider.lastKey)
	}

	r.provider.video = heygen.Video{Status: heygen.VideoProcessing}
	r.proc.Handle(ctx, r.repo.Job(job.ID))
	if got := r.repo.Job(job.ID); got.Status != jobs.StatusRunning || len(got.Result) != 0 {
		t.Fatalf("processing must not complete the job: %+v", got)
	}

	r.provider.video = heygen.Video{Status: heygen.VideoCompleted} // completed, but no file yet
	r.proc.Handle(ctx, r.repo.Job(job.ID))
	if got := r.repo.Job(job.ID); got.Status != jobs.StatusRunning {
		t.Fatalf("completed without a file is not a success: %+v", got)
	}

	r.provider.video = heygen.Video{Status: heygen.VideoCompleted, VideoURL: "https://files/v.mp4?sig=1", DurationSecond: 9}
	r.proc.Handle(ctx, r.repo.Job(job.ID))
	got = r.repo.Job(job.ID)
	if got.Status != jobs.StatusCompleted || got.Progress != 100 || got.Result["video_url"] != "https://files/v.mp4?sig=1" || got.NextRunAt != nil {
		t.Fatalf("completed: %+v", got)
	}
	for _, u := range r.events.users {
		if u != alice {
			t.Fatalf("event for %q", u)
		}
	}
}

func TestProviderFailureIsGeneric(t *testing.T) {
	for code, want := range map[string]string{"script_rejected": msgFailed, "insufficient_credit": msgUnavailable} {
		r := newRig()
		job := r.queued(t)
		r.proc.Handle(ctx, job)
		r.provider.video = heygen.Video{Status: heygen.VideoFailed, FailureCode: code, FailureMessage: "internal secret detail"}
		r.proc.Handle(ctx, r.repo.Job(job.ID))
		got := r.repo.Job(job.ID)
		if got.Status != jobs.StatusFailed || got.Error != want || strings.Contains(got.Error, "secret") {
			t.Fatalf("%s: %+v", code, got)
		}
	}
}

func TestSubmitErrorsRetryOnlyWhenTransientAndBounded(t *testing.T) {
	r := newRig()
	r.provider.createErr = &provider.Error{Provider: "heygen", Status: 503, Transient: true}
	job := r.queued(t)
	for attempt := 1; attempt < maxAttempts; attempt++ {
		r.proc.Handle(ctx, r.repo.Job(job.ID))
		if got := r.repo.Job(job.ID); got.Status.Terminal() || got.RetryCount != attempt {
			t.Fatalf("attempt %d: %+v", attempt, got)
		}
	}
	r.proc.Handle(ctx, r.repo.Job(job.ID))
	if got := r.repo.Job(job.ID); got.Status != jobs.StatusFailed || got.Error != msgUnavailable {
		t.Fatalf("retries must be bounded: %+v", got)
	}
	// Every attempt used the same key, so HeyGen can replay rather than bill again.
	if r.provider.lastKey != "job-"+job.ID {
		t.Fatalf("key changed between attempts: %q", r.provider.lastKey)
	}

	r2 := newRig()
	r2.provider.createErr = &provider.Error{Provider: "heygen", Status: 400, Code: "bad_script"}
	j2 := r2.queued(t)
	r2.proc.Handle(ctx, j2)
	if got := r2.repo.Job(j2.ID); got.Status != jobs.StatusFailed || got.RetryCount != 0 {
		t.Fatalf("a permanent error must not retry: %+v", got)
	}
}

func TestAvatarRemovedAfterQueueingFailsCleanly(t *testing.T) {
	r := newRig()
	job := r.queued(t)
	r.proc.Avatars = fakeAvatars{}
	r.proc.Handle(ctx, job)
	if got := r.repo.Job(job.ID); got.Status != jobs.StatusFailed || got.Error != msgAvatar || r.provider.creates != 0 {
		t.Fatalf("got %+v", got)
	}
}

func TestRestartResumesPollingWithoutResubmitting(t *testing.T) {
	r := newRig()
	job := r.queued(t)
	r.proc.Handle(ctx, job)
	creates := r.provider.creates

	r.provider.video = heygen.Video{Status: heygen.VideoCompleted, VideoURL: "https://files/v.mp4"}
	r.proc.Handle(ctx, r.repo.Job(job.ID))
	if r.provider.creates != creates || r.repo.Job(job.ID).Status != jobs.StatusCompleted {
		t.Fatal("a job with a provider video must only be polled")
	}
}

func TestReconcileIsIdempotentAndIgnoresOtherJobTypes(t *testing.T) {
	r := newRig()
	job := r.queued(t)
	r.proc.Handle(ctx, job)

	r.provider.video = heygen.Video{Status: heygen.VideoProcessing}
	r.proc.Reconcile(ctx, "v_1")
	if got := r.repo.Job(job.ID); got.Status != jobs.StatusRunning {
		t.Fatalf("a callback alone must not complete a job: %+v", got)
	}

	r.provider.video = heygen.Video{Status: heygen.VideoCompleted, VideoURL: "https://files/v.mp4"}
	r.proc.Reconcile(ctx, "v_1")
	events := len(r.events.users)
	r.proc.Reconcile(ctx, "v_1")
	r.proc.Reconcile(ctx, "v_1")
	r.proc.Reconcile(ctx, "unknown")
	if len(r.events.users) != events {
		t.Fatal("duplicate callbacks must not emit more events")
	}

	other, _, _ := r.proc.Jobs.Create(ctx, alice, "video_transform", nil, "")
	taskID := "v_other"
	_, _ = r.proc.Jobs.Advance(ctx, other.ID, jobs.Update{ProviderTaskID: &taskID})
	r.proc.Reconcile(ctx, "v_other")
	if got := r.repo.Job(other.ID); got.Status != jobs.StatusQueued {
		t.Fatal("reconcile must only touch avatar video jobs")
	}
}

func TestTransientLookupErrorsAreRescheduled(t *testing.T) {
	r := newRig()
	job := r.queued(t)
	r.proc.Handle(ctx, job)
	r.provider.getErr = &provider.Error{Provider: "heygen", Status: 503, Transient: true}
	r.proc.Handle(ctx, r.repo.Job(job.ID))
	if got := r.repo.Job(job.ID); got.Status != jobs.StatusRunning || got.NextRunAt == nil {
		t.Fatalf("got %+v", got)
	}
	r.provider.getErr = &provider.Error{Provider: "heygen", Status: 404}
	r.proc.Handle(ctx, r.repo.Job(job.ID))
	if got := r.repo.Job(job.ID); got.Status != jobs.StatusFailed {
		t.Fatalf("got %+v", got)
	}
}

func TestJobsAreAbandonedAfterMaxAge(t *testing.T) {
	r := newRig()
	job := r.queued(t)
	r.proc.Handle(ctx, job)
	r.proc.Now = func() time.Time { return time.Now().Add(maxJobAge + time.Minute) }
	r.proc.Handle(ctx, r.repo.Job(job.ID))
	if got := r.repo.Job(job.ID); got.Status != jobs.StatusFailed || got.Error != msgTimedOut {
		t.Fatalf("got %+v", got)
	}
}

func TestGetRefreshesExpiredFileURLs(t *testing.T) {
	r := newRig()
	job := r.queued(t)
	r.proc.Handle(ctx, job)
	r.provider.video = heygen.Video{Status: heygen.VideoCompleted, VideoURL: "https://files/old.mp4?sig=old"}
	r.proc.Handle(ctx, r.repo.Job(job.ID))

	r.provider.video = heygen.Video{Status: heygen.VideoCompleted, VideoURL: "https://files/new.mp4?sig=new"}
	got, err := r.proc.Get(ctx, alice, job.ID)
	if err != nil || got.Result["video_url"] != "https://files/new.mp4?sig=new" {
		t.Fatalf("%+v %v", got, err)
	}
	r.provider.getErr = &provider.Error{Provider: "heygen", Status: 503, Transient: true}
	if got, err := r.proc.Get(ctx, alice, job.ID); err != nil || got.Result["video_url"] != "https://files/old.mp4?sig=old" {
		t.Fatalf("a refresh failure should fall back to the stored URL: %+v %v", got, err)
	}
	if _, err := r.proc.Get(ctx, bob, job.ID); !errors.Is(err, jobs.ErrNotFound) {
		t.Fatalf("another user's video must be not found: %v", err)
	}
	other, _, _ := r.proc.Jobs.Create(ctx, alice, "video_transform", nil, "")
	if _, err := r.proc.Get(ctx, alice, other.ID); !errors.Is(err, jobs.ErrNotFound) {
		t.Fatalf("other job types are not videos: %v", err)
	}
}

type fakeReporter struct{ errs []error }

func (f *fakeReporter) Report(_ context.Context, err error, _ alerts.Context) provider.Class {
	f.errs = append(f.errs, err)
	return provider.Classify(err)
}

func TestNoCreditAtTheProviderFailsGenericallyAndAlertsTheAdmin(t *testing.T) {
	r := newRig()
	rep := &fakeReporter{}
	r.proc.Alerts = rep
	r.provider.createErr = &provider.Error{Provider: "heygen", Status: 402, Message: "insufficient credit on account acct_secret_123"}
	job := r.queued(t)

	r.proc.Handle(ctx, job)
	got := r.repo.Job(job.ID)
	if got.Status != jobs.StatusFailed || got.Error != msgUnavailable || strings.Contains(got.Error, "acct_secret") {
		t.Fatalf("the user must get a generic message: %+v", got)
	}
	if len(rep.errs) != 1 || provider.Classify(rep.errs[0]) != provider.ClassQuota {
		t.Fatalf("the admin must be alerted about the quota problem: %v", rep.errs)
	}
}
