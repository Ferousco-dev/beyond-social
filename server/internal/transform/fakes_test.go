package transform

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

const (
	alice = "6f1c5a0e-7a53-4d0e-9f56-0a3f6a1b2c3d"
	bob   = "0b5d3c1a-2d4e-4f60-8a71-92b3c4d5e6f7"
)

// fakeJobs applies updates the way the SQL store does, including rejecting
// changes to finished jobs.
type fakeJobs struct {
	mu   sync.Mutex
	rows map[string]jobs.Job
	seq  int
}

func newFakeJobs() *fakeJobs { return &fakeJobs{rows: map[string]jobs.Job{}} }

func (f *fakeJobs) Create(_ context.Context, j jobs.Job) (jobs.Job, bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if j.IdempotencyKey != "" {
		for _, e := range f.rows {
			if e.UserID == j.UserID && e.IdempotencyKey == j.IdempotencyKey {
				return e, false, nil
			}
		}
	}
	f.seq++
	j.ID = fmt.Sprintf("job-%d", f.seq)
	j.CreatedAt = time.Now()
	f.rows[j.ID] = j
	return j, true, nil
}

func (f *fakeJobs) List(context.Context, string, int, int) ([]jobs.Job, error) { return nil, nil }

func (f *fakeJobs) Get(_ context.Context, userID, id string) (jobs.Job, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if j, ok := f.rows[id]; ok && j.UserID == userID {
		return j, nil
	}
	return jobs.Job{}, jobs.ErrNotFound
}

func (f *fakeJobs) CountActive(_ context.Context, userID, jobType string) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	n := 0
	for _, j := range f.rows {
		if j.UserID == userID && j.Type == jobType && !j.Status.Terminal() {
			n++
		}
	}
	return n, nil
}

func (f *fakeJobs) Claim(context.Context, string, int, time.Duration) ([]jobs.Job, error) {
	return nil, nil
}

func (f *fakeJobs) ByProviderTask(_ context.Context, taskID string) (jobs.Job, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, j := range f.rows {
		if j.ProviderTaskID == taskID {
			return j, nil
		}
	}
	return jobs.Job{}, jobs.ErrNotFound
}

func (f *fakeJobs) Advance(_ context.Context, id string, u jobs.Update) (jobs.Job, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	j, ok := f.rows[id]
	if !ok {
		return jobs.Job{}, jobs.ErrNotFound
	}
	if j.Status.Terminal() {
		return jobs.Job{}, fmt.Errorf("%w: already %s", jobs.ErrInvalidTransition, j.Status)
	}
	if u.Status != "" && u.Status != j.Status {
		if err := jobs.ValidateTransition(j.Status, u.Status); err != nil {
			return jobs.Job{}, err
		}
		j.Status = u.Status
	}
	if u.Stage != nil {
		j.Stage = *u.Stage
	}
	if u.Progress != nil {
		j.Progress = *u.Progress
	}
	if u.ProviderTaskID != nil {
		j.ProviderTaskID = *u.ProviderTaskID
	}
	if u.Result != nil {
		j.Result = u.Result
	}
	if u.Error != "" {
		j.Error = u.Error
	}
	j.RetryCount += u.RetryDelta
	if j.Status.Terminal() {
		j.NextRunAt = nil
	} else if u.NextRun != nil {
		j.NextRunAt = u.NextRun
	}
	f.rows[id] = j
	return j, nil
}

func (f *fakeJobs) get(id string) jobs.Job {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.rows[id]
}

type recorder struct {
	mu     sync.Mutex
	events []realtime.Event
	users  []string
}

func (r *recorder) Publish(userID string, e realtime.Event) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events = append(r.events, e)
	r.users = append(r.users, userID)
}

type fakeVideos map[string]video.Video // key: userID + "/" + videoID

func (f fakeVideos) Video(_ context.Context, userID, videoID string) (video.Video, error) {
	if v, ok := f[userID+"/"+videoID]; ok {
		return v, nil
	}
	return video.Video{}, errNotFound
}

type fakeResolver struct {
	url string
	err error
}

func (f fakeResolver) Resolve(context.Context, video.Platform, string) (string, error) {
	return f.url, f.err
}

type fakeFetcher struct {
	data []byte
	err  error
	got  string
}

func (f *fakeFetcher) Fetch(_ context.Context, u string, _ int64) ([]byte, error) {
	f.got = u
	return f.data, f.err
}

type fakeProvider struct {
	uploadErr, createErr, getErr error
	task                         kie.Task
	creates                      int
	lastRequest                  kie.TaskRequest
	uploads                      int
}

func (f *fakeProvider) Upload(context.Context, string, string, []byte) (string, error) {
	f.uploads++
	return "https://kie.example/uploaded.mp4", f.uploadErr
}

func (f *fakeProvider) CreateTask(_ context.Context, r kie.TaskRequest) (string, error) {
	f.creates++
	f.lastRequest = r
	if f.createErr != nil {
		return "", f.createErr
	}
	return "task_1", nil
}

func (f *fakeProvider) GetTask(context.Context, string) (kie.Task, error) { return f.task, f.getErr }

var mp4Bytes = append([]byte{0, 0, 0, 0x18}, []byte("ftypmp42 padding")...)

type rig struct {
	t        *testing.T
	jobs     *fakeJobs
	service  *jobs.Service
	events   *recorder
	provider *fakeProvider
	fetcher  *fakeFetcher
	resolver *fakeResolver
	proc     *Processor
}

func newRig(t *testing.T) *rig {
	t.Helper()
	r := &rig{t: t, jobs: newFakeJobs(), events: &recorder{}, provider: &fakeProvider{}, fetcher: &fakeFetcher{data: mp4Bytes}}
	r.service = jobs.NewService(r.jobs, r.events)
	r.resolver = &fakeResolver{url: "https://cdn.example/v.mp4"}
	r.proc = &Processor{Jobs: r.service, Provider: r.provider, Fetcher: r.fetcher, Resolver: r.resolver,
		CallbackURL: "https://api.example/api/v1/callbacks/kie"}
	return r
}

// queued creates a queued transform job for alice.
func (r *rig) queued() jobs.Job {
	r.t.Helper()
	job, _, err := r.service.Create(context.Background(), alice, JobType, map[string]any{
		"video_id": "vid-1", "platform": "tiktok", "source_url": "https://www.tiktok.com/@a/video/1",
		"prompt": "make it neon", "duration": "5", "resolution": "720p",
	}, "")
	if err != nil {
		r.t.Fatal(err)
	}
	return job
}

var errNotFound = discovery.ErrNotFound
