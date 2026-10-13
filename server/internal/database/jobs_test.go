package database

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/google/uuid"
)

func newJob(t *testing.T, store *JobStore, userID, jobType string) jobs.Job {
	t.Helper()
	j, err := jobs.NewJob(userID, jobType, map[string]any{"prompt": "hi"})
	if err != nil {
		t.Fatal(err)
	}
	created, isNew, err := store.Create(context.Background(), j)
	if err != nil || !isNew {
		t.Fatalf("create: %v new=%v", err, isNew)
	}
	return created
}

func status(s jobs.Status) jobs.Update { return jobs.Update{Status: s} }

func TestCreatePersistsQueuedJobForOwner(t *testing.T) {
	store := NewJobStore(testPool(t))
	owner := uuid.NewString()

	job := newJob(t, store, owner, "discover")
	if job.ID == "" || job.UserID != owner || job.Status != jobs.StatusQueued || job.Input["prompt"] != "hi" || job.CreatedAt.IsZero() {
		t.Fatalf("unexpected created job %+v", job)
	}
	got, err := store.Get(context.Background(), owner, job.ID)
	if err != nil || got.ID != job.ID || got.Error != "" || got.Result == nil {
		t.Fatalf("get after create: %+v %v", got, err)
	}
}

func TestJobOwnershipIsEnforcedInSQL(t *testing.T) {
	store := NewJobStore(testPool(t))
	ctx := context.Background()
	alice, mallory := uuid.NewString(), uuid.NewString()
	job := newJob(t, store, alice, "discover")

	for name, id := range map[string]string{"foreign": job.ID, "missing": uuid.NewString(), "malformed": "not-a-uuid"} {
		if _, err := store.Get(ctx, mallory, id); !errors.Is(err, jobs.ErrNotFound) {
			t.Errorf("%s get: expected ErrNotFound, got %v", name, err)
		}
	}
	if list, err := store.List(ctx, mallory, 10, 0); err != nil || len(list) != 0 {
		t.Fatalf("foreign list: %+v %v", list, err)
	}
	if _, err := store.ByProviderTask(ctx, "task-that-does-not-exist"); !errors.Is(err, jobs.ErrNotFound) {
		t.Fatalf("unknown provider task: %v", err)
	}
	if n, _ := store.CountActive(ctx, mallory, "discover"); n != 0 {
		t.Fatalf("active count leaked another user's jobs: %d", n)
	}
}

func TestListIsOrderedAndPaginated(t *testing.T) {
	store := NewJobStore(testPool(t))
	ctx := context.Background()
	owner := uuid.NewString()
	var ids []string
	for range 5 {
		ids = append(ids, newJob(t, store, owner, "t").ID)
	}
	newJob(t, store, uuid.NewString(), "t")

	first, _ := store.List(ctx, owner, 2, 0)
	second, _ := store.List(ctx, owner, 2, 2)
	rest, _ := store.List(ctx, owner, 10, 4)
	if len(first) != 2 || len(second) != 2 || len(rest) != 1 {
		t.Fatalf("page sizes %d/%d/%d", len(first), len(second), len(rest))
	}
	if first[0].ID != ids[4] || rest[0].ID != ids[0] {
		t.Fatal("expected newest first")
	}
	seen := map[string]bool{}
	for _, j := range append(append(first, second...), rest...) {
		if j.UserID != owner || seen[j.ID] {
			t.Fatalf("foreign or duplicate job in pages: %+v", j)
		}
		seen[j.ID] = true
	}
}

func TestAdvanceLifecycle(t *testing.T) {
	store := NewJobStore(testPool(t))
	ctx := context.Background()
	owner := uuid.NewString()
	job := newJob(t, store, owner, "t")

	running, err := store.Advance(ctx, job.ID, status(jobs.StatusRunning))
	if err != nil || running.Status != jobs.StatusRunning || running.StartedAt == nil || running.CompletedAt != nil {
		t.Fatalf("to running: %+v %v", running, err)
	}
	if _, err := store.Advance(ctx, job.ID, status(jobs.StatusQueued)); !errors.Is(err, jobs.ErrInvalidTransition) {
		t.Fatalf("running -> queued must be rejected, got %v", err)
	}

	stage, task, progress := "generating", "task-1", 40
	mid, err := store.Advance(ctx, job.ID, jobs.Update{Stage: &stage, ProviderTaskID: &task, Progress: &progress})
	if err != nil || mid.Status != jobs.StatusRunning || mid.Stage != "generating" || mid.ProviderTaskID != "task-1" || mid.Progress != 40 {
		t.Fatalf("progress update: %+v %v", mid, err)
	}
	if byTask, err := store.ByProviderTask(ctx, "task-1"); err != nil || byTask.ID != job.ID {
		t.Fatalf("lookup by task: %+v %v", byTask, err)
	}

	done, err := store.Advance(ctx, job.ID, jobs.Update{Status: jobs.StatusCompleted, Result: map[string]any{"video_url": "https://x/y.mp4"}})
	if err != nil || done.Status != jobs.StatusCompleted || done.CompletedAt == nil || done.NextRunAt != nil || done.Result["video_url"] != "https://x/y.mp4" {
		t.Fatalf("to completed: %+v %v", done, err)
	}
	// A late callback or a stale worker must not be able to change a finished job.
	if _, err := store.Advance(ctx, job.ID, status(jobs.StatusFailed)); !errors.Is(err, jobs.ErrInvalidTransition) {
		t.Fatalf("terminal jobs must not move, got %v", err)
	}
	if got, _ := store.Get(ctx, owner, job.ID); got.Status != jobs.StatusCompleted || got.Error != "" {
		t.Fatalf("rejected update altered the row: %+v", got)
	}
}

func TestAdvanceKeepsResultAndRecordsFailure(t *testing.T) {
	store := NewJobStore(testPool(t))
	ctx := context.Background()
	job := newJob(t, store, uuid.NewString(), "t")
	_, _ = store.Advance(ctx, job.ID, jobs.Update{Status: jobs.StatusRunning, Result: map[string]any{"step": 1}})

	failed, err := store.Advance(ctx, job.ID, jobs.Update{Status: jobs.StatusFailed, Error: "provider timeout", RetryDelta: 1})
	if err != nil || failed.Error != "provider timeout" || failed.Result["step"] != float64(1) || failed.CompletedAt == nil || failed.RetryCount != 1 {
		t.Fatalf("to failed: %+v %v", failed, err)
	}
}

func TestAdvanceReschedulesOnlyNonTerminalJobs(t *testing.T) {
	store := NewJobStore(testPool(t))
	ctx := context.Background()
	job := newJob(t, store, uuid.NewString(), "t")
	later := time.Now().Add(time.Hour).UTC().Truncate(time.Second)

	got, _ := store.Advance(ctx, job.ID, jobs.Update{Status: jobs.StatusRunning, NextRun: &later})
	if got.NextRunAt == nil || !got.NextRunAt.Equal(later) {
		t.Fatalf("expected next run at %v, got %v", later, got.NextRunAt)
	}
	got, _ = store.Advance(ctx, job.ID, jobs.Update{Status: jobs.StatusFailed, NextRun: &later})
	if got.NextRunAt != nil {
		t.Fatal("a finished job must leave the schedule even if a next run is passed")
	}
}

func TestConcurrentAdvancesApplyExactlyOnce(t *testing.T) {
	store := NewJobStore(testPool(t))
	ctx := context.Background()
	job := newJob(t, store, uuid.NewString(), "t")
	_, _ = store.Advance(ctx, job.ID, status(jobs.StatusRunning))

	var wg sync.WaitGroup
	results := make(chan error, 8)
	for range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := store.Advance(ctx, job.ID, status(jobs.StatusCompleted))
			results <- err
		}()
	}
	wg.Wait()
	close(results)
	wins := 0
	for err := range results {
		if err == nil {
			wins++
		}
	}
	if wins != 1 {
		t.Fatalf("expected exactly one winner, got %d", wins)
	}
}

func TestIdempotentCreate(t *testing.T) {
	store := NewJobStore(testPool(t))
	ctx := context.Background()
	alice, bob := uuid.NewString(), uuid.NewString()

	mk := func(user string) jobs.Job {
		j, _ := jobs.NewJob(user, "video_transform", map[string]any{"n": 1})
		j.IdempotencyKey = "same-key"
		return j
	}
	first, isNew, err := store.Create(ctx, mk(alice))
	if err != nil || !isNew {
		t.Fatalf("first: %v %v", err, isNew)
	}
	again, isNew, err := store.Create(ctx, mk(alice))
	if err != nil || isNew || again.ID != first.ID {
		t.Fatalf("repeat should return the original: %+v new=%v %v", again, isNew, err)
	}
	other, isNew, err := store.Create(ctx, mk(bob))
	if err != nil || !isNew || other.ID == first.ID {
		t.Fatalf("keys are per user: %+v new=%v %v", other, isNew, err)
	}

	var wg sync.WaitGroup
	ids := make(chan string, 6)
	for range 6 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			j, _ := jobs.NewJob(alice, "video_transform", nil)
			j.IdempotencyKey = "racy-key"
			created, _, err := store.Create(ctx, j)
			if err != nil {
				t.Errorf("racing create: %v", err)
			}
			ids <- created.ID
		}()
	}
	wg.Wait()
	close(ids)
	seen := map[string]bool{}
	for id := range ids {
		seen[id] = true
	}
	if len(seen) != 1 {
		t.Fatalf("concurrent duplicates must collapse to one job, got %d", len(seen))
	}
}

func TestClaimLeasesDueJobsOnce(t *testing.T) {
	store := NewJobStore(testPool(t))
	ctx := context.Background()
	owner := uuid.NewString()
	for range 3 {
		newJob(t, store, owner, "video_transform")
	}
	newJob(t, store, owner, "other_type")

	first, err := store.Claim(ctx, "video_transform", 2, time.Minute)
	if err != nil || len(first) != 2 {
		t.Fatalf("expected 2 claimed, got %d %v", len(first), err)
	}
	if rest, _ := store.Claim(ctx, "video_transform", 10, time.Minute); len(rest) != 1 {
		t.Fatalf("a leased job must not be claimed again, got %d", len(rest))
	}
	if again, _ := store.Claim(ctx, "video_transform", 10, time.Minute); len(again) != 0 {
		t.Fatalf("nothing is due while leases hold, got %d", len(again))
	}

	// An expired lease models a crashed worker: the job becomes due again by itself.
	if _, err := store.pool.Exec(ctx, `update public.jobs set next_run_at = now() - interval '1 second' where id = $1`, first[0].ID); err != nil {
		t.Fatal(err)
	}
	if reclaimed, _ := store.Claim(ctx, "video_transform", 10, time.Minute); len(reclaimed) != 1 || reclaimed[0].ID != first[0].ID {
		t.Fatalf("an expired lease must make the job due again, got %+v", reclaimed)
	}

	// Finished jobs are never claimed.
	_, _ = store.Advance(ctx, first[1].ID, status(jobs.StatusFailed))
	_, _ = store.pool.Exec(ctx, `update public.jobs set next_run_at = now() - interval '1 second'`)
	claimed, _ := store.Claim(ctx, "video_transform", 10, time.Minute)
	for _, j := range claimed {
		if j.ID == first[1].ID {
			t.Fatal("a finished job was claimed")
		}
	}
}
