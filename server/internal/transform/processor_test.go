package transform

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
)

var ctx = context.Background()

func TestHappyPathSubmitsThenCompletesOnlyOnProviderSuccess(t *testing.T) {
	r := newRig(t)
	job := r.queued()

	r.proc.Handle(ctx, job)
	got := r.jobs.get(job.ID)
	if got.Status != jobs.StatusRunning || got.Stage != stageGenerating || got.ProviderTaskID != "task_1" || got.Progress != 40 || got.NextRunAt == nil {
		t.Fatalf("after submit: %+v", got)
	}
	req := r.provider.lastRequest
	if req.Prompt != "make it neon" || req.VideoURL != "https://kie.example/uploaded.mp4" || req.Duration != "5" ||
		req.Resolution != "720p" || req.CallbackURL != "https://api.example/api/v1/callbacks/kie" {
		t.Fatalf("unexpected provider request %+v", req)
	}
	if r.fetcher.got != "https://cdn.example/v.mp4" {
		t.Fatalf("fetched %q", r.fetcher.got)
	}

	// Provider still working: the job must not be reported as done.
	r.provider.task = kie.Task{State: kie.StatePending, Progress: 50}
	r.proc.Handle(ctx, r.jobs.get(job.ID))
	got = r.jobs.get(job.ID)
	if got.Status != jobs.StatusRunning || got.Progress != 70 || len(got.Result) > 0 {
		t.Fatalf("pending poll: %+v", got)
	}

	r.provider.task = kie.Task{State: kie.StateSuccess, ResultURLs: []string{"https://cdn.kie/out.mp4"}}
	r.proc.Handle(ctx, r.jobs.get(job.ID))
	got = r.jobs.get(job.ID)
	if got.Status != jobs.StatusCompleted || got.Progress != 100 || got.Result["video_url"] != "https://cdn.kie/out.mp4" || got.NextRunAt != nil {
		t.Fatalf("completed: %+v", got)
	}
	for _, u := range r.events.users {
		if u != alice {
			t.Fatalf("event went to %q", u)
		}
	}
}

func TestCompletionEmailOnlyWhenOptedIn(t *testing.T) {
	r := newRig(t)
	r.proc.Notifier = r.notify
	r.provider.task = kie.Task{State: kie.StateSuccess, ResultURLs: []string{"https://cdn.kie/out.mp4"}}
	newNotifiedJob := func(notify bool) jobs.Job {
		input := map[string]any{
			"video_id": "vid-1", "platform": "tiktok", "source_url": "https://www.tiktok.com/@a/video/1",
			"prompt": "make it neon", "duration": "5", "resolution": "720p",
		}
		if notify {
			input["notify_email"] = true
		}
		job, _, err := r.service.Create(context.Background(), alice, JobType, input, "")
		if err != nil {
			t.Fatal(err)
		}
		return job
	}

	// Without the flag, success stays silent.
	r.proc.Handle(ctx, newNotifiedJob(false))
	if len(r.notify.users) != 0 {
		t.Fatalf("no email expected, got %v", r.notify.users)
	}

	// With the flag, one email goes to the owner and only the owner.
	job := newNotifiedJob(true)
	r.proc.Handle(ctx, job)
	r.provider.task = kie.Task{State: kie.StateSuccess, ResultURLs: []string{"https://cdn.kie/out.mp4"}}
	r.proc.Handle(ctx, r.jobs.get(job.ID))
	if len(r.notify.users) != 1 || r.notify.users[0] != alice {
		t.Fatalf("expected one email to alice, got %v", r.notify.users)
	}
}

func TestProviderFailureIsGenericAndTerminal(t *testing.T) {
	r := newRig(t)
	job := r.queued()
	r.proc.Handle(ctx, job)

	r.provider.task = kie.Task{State: kie.StateFailed, FailCode: "501", FailMsg: "secret internal model error"}
	r.proc.Handle(ctx, r.jobs.get(job.ID))
	got := r.jobs.get(job.ID)
	if got.Status != jobs.StatusFailed || got.Error != msgFailed || strings.Contains(got.Error, "secret") || got.NextRunAt != nil {
		t.Fatalf("failed: %+v", got)
	}
}

func TestRejectedMediaFailsPermanentlyWithoutBilling(t *testing.T) {
	cases := map[string]struct {
		fetchErr error
		data     []byte
		msg      string
	}{
		"too large":  {fetchErr: safenet.ErrTooLarge, msg: msgTooLarge},
		"ssrf":       {fetchErr: safenet.ErrBlockedURL, msg: msgUnusable},
		"not video":  {data: []byte("<html>hello world, not a video</html>"), msg: msgUnusable},
		"empty file": {data: nil, msg: msgUnusable},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			r := newRig(t)
			r.fetcher.err, r.fetcher.data = tc.fetchErr, tc.data
			job := r.queued()
			r.proc.Handle(ctx, job)
			got := r.jobs.get(job.ID)
			if got.Status != jobs.StatusFailed || got.Error != tc.msg {
				t.Fatalf("got %+v", got)
			}
			if r.provider.uploads != 0 || r.provider.creates != 0 {
				t.Fatal("nothing may be uploaded or billed for rejected media")
			}
		})
	}
}

func TestNoVideoFileFailsPermanently(t *testing.T) {
	r := newRig(t)
	r.resolver.err = ErrNoVideoFile
	job := r.queued()
	r.proc.Handle(ctx, job)
	if got := r.jobs.get(job.ID); got.Status != jobs.StatusFailed || got.Error != msgUnusable {
		t.Fatalf("got %+v", got)
	}
}

func TestTransientPreparationErrorsRetryThenGiveUp(t *testing.T) {
	r := newRig(t)
	r.resolver.err = &provider.Error{Provider: "apify", Status: 503, Transient: true}
	job := r.queued()

	r.proc.Handle(ctx, job)
	got := r.jobs.get(job.ID)
	if got.Status != jobs.StatusRunning || got.RetryCount != 1 || got.NextRunAt == nil || got.Stage != stagePreparing {
		t.Fatalf("first failure should schedule a retry: %+v", got)
	}
	r.proc.Handle(ctx, got)
	got = r.jobs.get(job.ID)
	if got.RetryCount != 2 || got.Status != jobs.StatusRunning {
		t.Fatalf("second failure: %+v", got)
	}
	r.proc.Handle(ctx, got)
	got = r.jobs.get(job.ID)
	if got.Status != jobs.StatusFailed || got.Error != msgUnavailable {
		t.Fatalf("retries must be bounded: %+v", got)
	}
}

func TestPermanentProviderErrorsDoNotRetry(t *testing.T) {
	r := newRig(t)
	r.provider.uploadErr = &provider.Error{Provider: "kie", Status: 401, Message: "bad key"}
	job := r.queued()
	r.proc.Handle(ctx, job)
	got := r.jobs.get(job.ID)
	if got.Status != jobs.StatusFailed || got.RetryCount != 0 || strings.Contains(got.Error, "bad key") {
		t.Fatalf("got %+v", got)
	}
}

func TestSubmitFailureHandling(t *testing.T) {
	cases := map[string]struct {
		err        error
		wantStatus jobs.Status
		wantMsg    string
		wantRetry  int
	}{
		// A rejection KIE actually sent is safe to retry.
		"definite transient": {&provider.Error{Provider: "kie", Status: 500, Transient: true}, jobs.StatusRunning, "", 1},
		"permanent":          {&provider.Error{Provider: "kie", Status: 402, Message: "no credits"}, jobs.StatusFailed, msgUnavailable, 0},
		// No response at all: the task may exist, so retrying could bill twice.
		"ambiguous":    {&provider.Error{Provider: "kie", Message: "request failed", Transient: true}, jobs.StatusFailed, msgInterrupted, 0},
		"unclassified": {errors.New("boom"), jobs.StatusFailed, msgInterrupted, 0},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			r := newRig(t)
			r.provider.createErr = tc.err
			job := r.queued()
			r.proc.Handle(ctx, job)
			got := r.jobs.get(job.ID)
			if got.Status != tc.wantStatus || got.RetryCount != tc.wantRetry || (tc.wantMsg != "" && got.Error != tc.wantMsg) {
				t.Fatalf("got %+v", got)
			}
			if tc.wantStatus == jobs.StatusRunning && got.Stage != stagePreparing {
				t.Fatalf("a retried job must not look interrupted, stage=%q", got.Stage)
			}
			if r.provider.creates != 1 {
				t.Fatalf("expected one create attempt, got %d", r.provider.creates)
			}
		})
	}
}

func TestRestartDoesNotResubmitAmbiguousJobs(t *testing.T) {
	r := newRig(t)
	job := r.queued()
	submitting := stageSubmitting
	updated, _ := r.service.Advance(ctx, job.ID, jobs.Update{Status: jobs.StatusRunning, Stage: &submitting})

	r.proc.Handle(ctx, updated) // as if claimed again after a crash
	got := r.jobs.get(job.ID)
	if got.Status != jobs.StatusFailed || got.Error != msgInterrupted {
		t.Fatalf("got %+v", got)
	}
	if r.provider.creates != 0 || r.provider.uploads != 0 {
		t.Fatal("an interrupted submission must never be repeated automatically")
	}
}

func TestRestartResumesPollingWithoutResubmitting(t *testing.T) {
	r := newRig(t)
	job := r.queued()
	r.proc.Handle(ctx, job)
	creates := r.provider.creates

	r.provider.task = kie.Task{State: kie.StateSuccess, ResultURLs: []string{"https://cdn.kie/out.mp4"}}
	r.proc.Handle(ctx, r.jobs.get(job.ID)) // a "new process" picks the row up
	if r.provider.creates != creates || r.jobs.get(job.ID).Status != jobs.StatusCompleted {
		t.Fatal("a job with a task ID must only be polled")
	}
}

func TestReconcileIsIdempotentAndNeverTrustsTheCallback(t *testing.T) {
	r := newRig(t)
	job := r.queued()
	r.proc.Handle(ctx, job)

	// A callback arrives while KIE still reports the task as running.
	r.provider.task = kie.Task{State: kie.StatePending}
	r.proc.Reconcile(ctx, "task_1")
	if got := r.jobs.get(job.ID); got.Status != jobs.StatusRunning {
		t.Fatalf("a callback alone must not complete a job: %+v", got)
	}

	r.provider.task = kie.Task{State: kie.StateSuccess, ResultURLs: []string{"https://cdn.kie/out.mp4"}}
	r.proc.Reconcile(ctx, "task_1")
	eventsAfterFirst := len(r.events.events)
	r.proc.Reconcile(ctx, "task_1") // duplicate delivery
	r.proc.Reconcile(ctx, "task_1")
	if got := r.jobs.get(job.ID); got.Status != jobs.StatusCompleted {
		t.Fatalf("got %+v", got)
	}
	if len(r.events.events) != eventsAfterFirst {
		t.Fatal("duplicate callbacks must not emit further events")
	}

	r.proc.Reconcile(ctx, "task_unknown") // must be a silent no-op
}

func TestLateFailureCannotOverwriteCompletedJob(t *testing.T) {
	r := newRig(t)
	job := r.queued()
	r.proc.Handle(ctx, job)
	r.provider.task = kie.Task{State: kie.StateSuccess, ResultURLs: []string{"https://cdn.kie/out.mp4"}}
	stale := r.jobs.get(job.ID)
	r.proc.Handle(ctx, stale)

	r.provider.task = kie.Task{State: kie.StateFailed}
	r.proc.Handle(ctx, stale) // a worker holding an old copy
	if got := r.jobs.get(job.ID); got.Status != jobs.StatusCompleted || got.Error != "" {
		t.Fatalf("got %+v", got)
	}
}

func TestTransientLookupErrorsAreRescheduledNotFailed(t *testing.T) {
	r := newRig(t)
	job := r.queued()
	r.proc.Handle(ctx, job)

	r.provider.getErr = &provider.Error{Provider: "kie", Status: 503, Transient: true}
	r.proc.Handle(ctx, r.jobs.get(job.ID))
	if got := r.jobs.get(job.ID); got.Status != jobs.StatusRunning || got.NextRunAt == nil {
		t.Fatalf("got %+v", got)
	}
	r.provider.getErr = &provider.Error{Provider: "kie", Status: 404}
	r.proc.Handle(ctx, r.jobs.get(job.ID))
	if got := r.jobs.get(job.ID); got.Status != jobs.StatusFailed {
		t.Fatalf("a permanent lookup error should fail the job: %+v", got)
	}
}

func TestJobsAreAbandonedAfterMaxAge(t *testing.T) {
	r := newRig(t)
	job := r.queued()
	r.proc.Handle(ctx, job)
	r.proc.Now = func() time.Time { return time.Now().Add(maxJobAge + time.Minute) }

	r.proc.Handle(ctx, r.jobs.get(job.ID))
	if got := r.jobs.get(job.ID); got.Status != jobs.StatusFailed || got.Error != msgTimedOut {
		t.Fatalf("got %+v", got)
	}
}

func TestNoCallbackURLWhenNotConfigured(t *testing.T) {
	r := newRig(t)
	r.proc.CallbackURL = ""
	r.proc.Handle(ctx, r.queued())
	if r.provider.lastRequest.CallbackURL != "" {
		t.Fatal("no callback URL should be sent without PUBLIC_BASE_URL")
	}
}
