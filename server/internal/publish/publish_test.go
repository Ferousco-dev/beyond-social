package publish

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

type memStore struct {
	mu    sync.Mutex
	posts map[string]*Post
	keys  map[string]string
	seq   int
}

func newMem() *memStore { return &memStore{posts: map[string]*Post{}, keys: map[string]string{}} }

func (m *memStore) Create(_ context.Context, p Post, key string) (Post, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if key != "" {
		if id, ok := m.keys[p.UserID+key]; ok {
			return *m.posts[id], false, nil
		}
	}
	m.seq++
	p.ID = "post-" + string(rune('a'+m.seq))
	p.Status = StatusPreparing
	m.posts[p.ID] = &p
	if key != "" {
		m.keys[p.UserID+key] = p.ID
	}
	return p, true, nil
}
func (m *memStore) Get(_ context.Context, user, id string) (Post, error) {
	if p, ok := m.posts[id]; ok && p.UserID == user {
		return *p, nil
	}
	return Post{}, ErrNotFound
}
func (m *memStore) List(context.Context, string, int, int) ([]Post, error) { return nil, nil }
func (m *memStore) CountOpen(_ context.Context, user string) (int, error) {
	n := 0
	for _, p := range m.posts {
		if p.UserID == user && !p.Status.Terminal() {
			n++
		}
	}
	return n, nil
}
func (m *memStore) Cancel(_ context.Context, user, id string) (Post, error) {
	p, ok := m.posts[id]
	if !ok || p.UserID != user {
		return Post{}, ErrNotFound
	}
	if (p.Status != StatusPreparing && p.Status != StatusScheduled) || p.PublishStartedAt != nil {
		return Post{}, ErrNotCancellable
	}
	p.Status = StatusCancelled
	return *p, nil
}
func (m *memStore) Reschedule(_ context.Context, user, id string, at time.Time) (Post, error) {
	p, ok := m.posts[id]
	if !ok || p.UserID != user {
		return Post{}, ErrNotFound
	}
	if (p.Status != StatusPreparing && p.Status != StatusScheduled) || p.PublishStartedAt != nil {
		return Post{}, ErrNotReschedulable
	}
	p.ScheduledAt = at
	return *p, nil
}
func (m *memStore) Claim(context.Context, int, time.Duration) ([]Post, error) { return nil, nil }
func (m *memStore) Advance(_ context.Context, id string, u Update) (Post, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.posts[id]
	if !ok || p.Status.Terminal() {
		return Post{}, ErrNotFound
	}
	if u.Status != "" {
		p.Status = u.Status
	}
	if u.StoragePath != nil {
		p.StoragePath = *u.StoragePath
	}
	if u.NextRun != nil {
		p.NextRunAt = u.NextRun
	}
	if u.MarkStarted && p.PublishStartedAt == nil {
		now := time.Now()
		p.PublishStartedAt = &now
	}
	if u.ExternalID != "" {
		p.ExternalID, p.ExternalURL = u.ExternalID, u.ExternalURL
	}
	if u.Error != "" {
		p.Error = u.Error
	}
	p.Attempts += u.AttemptsDelta
	return *p, nil
}

type fakeJobs struct{ job jobs.Job }

func (f fakeJobs) Get(_ context.Context, user, id string) (jobs.Job, error) {
	if f.job.ID != id || f.job.UserID != user {
		return jobs.Job{}, jobs.ErrNotFound
	}
	return f.job, nil
}

type fakeAccounts struct{ err error }

func (f fakeAccounts) Usable(context.Context, string, social.Platform) error { return f.err }

func readyJob() jobs.Job {
	return jobs.Job{ID: "job-1", UserID: "u1", Status: jobs.StatusCompleted, Result: map[string]any{"video_url": "https://cdn.example/v.mp4"}}
}

func newService(accounts Accounts, store *memStore) *Service {
	return NewService(store, fakeJobs{job: readyJob()}, accounts)
}

func TestScheduleChecksTheVideoTheAccountAndTheTime(t *testing.T) {
	ctx := context.Background()
	store := newMem()
	svc := newService(fakeAccounts{}, store)
	soon := svc.now().Add(time.Hour)
	post, isNew, err := svc.Schedule(ctx, "u1", Request{Platform: social.YouTube, Caption: " hello ", JobID: "job-1", At: &soon}, "k1")
	if err != nil || !isNew || post.Status != StatusPreparing || post.Caption != "hello" || post.SourceURL != "https://cdn.example/v.mp4" || post.JobID != "job-1" || post.Visibility != "public" {
		t.Fatalf("post = %+v new=%v err=%v", post, isNew, err)
	}
	again, isNew, err := svc.Schedule(ctx, "u1", Request{Platform: social.YouTube, Caption: "hello", JobID: "job-1", At: &soon}, "k1")
	if err != nil || isNew || again.ID != post.ID {
		t.Fatalf("a repeat made a second post: %+v new=%v err=%v", again, isNew, err)
	}

	past, far := svc.now().Add(-time.Hour), svc.now().Add(400*24*time.Hour)
	for name, r := range map[string]Request{
		"unknown platform":   {Platform: "myspace", JobID: "job-1"},
		"no video":           {Platform: social.YouTube},
		"both videos":        {Platform: social.YouTube, JobID: "job-1", SourceURL: "https://x/y.mp4"},
		"someone else's job": {Platform: social.YouTube, JobID: "job-9"},
		"insecure address":   {Platform: social.YouTube, SourceURL: "http://x/y.mp4"},
		"in the past":        {Platform: social.YouTube, JobID: "job-1", At: &past},
		"too far ahead":      {Platform: social.YouTube, JobID: "job-1", At: &far},
		"caption too long":   {Platform: social.YouTube, JobID: "job-1", Caption: strings.Repeat("a", maxCaption+1)},
		"odd visibility":     {Platform: social.YouTube, JobID: "job-1", Visibility: "friends"},
	} {
		if _, _, err := svc.Schedule(ctx, "u1", r, ""); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: err = %v", name, err)
		}
	}
}

func TestAJobThatIsNotFinishedOrMadeNoVideoCannotBePosted(t *testing.T) {
	store := newMem()
	for name, job := range map[string]jobs.Job{
		"running":  {ID: "job-1", UserID: "u1", Status: jobs.StatusRunning},
		"no video": {ID: "job-1", UserID: "u1", Status: jobs.StatusCompleted, Result: map[string]any{}},
		"http":     {ID: "job-1", UserID: "u1", Status: jobs.StatusCompleted, Result: map[string]any{"video_url": "http://x/v.mp4"}},
	} {
		svc := NewService(store, fakeJobs{job: job}, fakeAccounts{})
		if _, _, err := svc.Schedule(context.Background(), "u1", Request{Platform: social.YouTube, JobID: "job-1"}, ""); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: err = %v", name, err)
		}
	}
}

func TestAnAccountThatCannotBeUsedStopsTheSchedule(t *testing.T) {
	for _, accountErr := range []error{social.ErrNotConnected, social.ErrReconnect} {
		svc := newService(fakeAccounts{err: accountErr}, newMem())
		if _, _, err := svc.Schedule(context.Background(), "u1", Request{Platform: social.YouTube, JobID: "job-1"}, ""); !errors.Is(err, accountErr) {
			t.Errorf("err = %v, want %v", err, accountErr)
		}
	}
}

func TestOnlyAPostThatHasNotStartedCanBeCancelled(t *testing.T) {
	ctx := context.Background()
	store := newMem()
	svc := newService(fakeAccounts{}, store)
	post, _, _ := svc.Schedule(ctx, "u1", Request{Platform: social.YouTube, JobID: "job-1"}, "")
	if _, err := svc.Cancel(ctx, "u2", post.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("someone else cancelled it: %v", err)
	}
	if got, err := svc.Cancel(ctx, "u1", post.ID); err != nil || got.Status != StatusCancelled {
		t.Fatalf("cancel = %+v err=%v", got, err)
	}
	other, _, _ := svc.Schedule(ctx, "u1", Request{Platform: social.YouTube, JobID: "job-1"}, "")
	store.posts[other.ID].PublishStartedAt = timePtr(time.Now())
	if _, err := svc.Cancel(ctx, "u1", other.ID); !errors.Is(err, ErrNotCancellable) {
		t.Fatalf("a post already sent was cancelled: %v", err)
	}
}

func TestOnlyAPostThatHasNotStartedCanBeRescheduled(t *testing.T) {
	ctx := context.Background()
	store := newMem()
	svc := newService(fakeAccounts{}, store)
	post, _, _ := svc.Schedule(ctx, "u1", Request{Platform: social.YouTube, JobID: "job-1"}, "")
	if _, err := svc.Reschedule(ctx, "u2", post.ID, time.Now().Add(2*time.Hour)); !errors.Is(err, ErrNotFound) {
		t.Fatalf("someone else rescheduled it: %v", err)
	}
	if _, err := svc.Reschedule(ctx, "u1", post.ID, time.Now().Add(-time.Hour)); !errors.Is(err, ErrInvalid) {
		t.Fatalf("a past time was accepted: %v", err)
	}
	moved, err := svc.Reschedule(ctx, "u1", post.ID, time.Now().Add(2*time.Hour))
	if err != nil || moved.Status != StatusPreparing {
		t.Fatalf("reschedule = %+v err=%v", moved, err)
	}
	store.posts[post.ID].PublishStartedAt = timePtr(time.Now())
	if _, err := svc.Reschedule(ctx, "u1", post.ID, time.Now().Add(3*time.Hour)); !errors.Is(err, ErrNotReschedulable) {
		t.Fatalf("a post already sent was rescheduled: %v", err)
	}
}

func timePtr(t time.Time) *time.Time { return &t }

// processor fakes

type fakeFetcher struct {
	data  []byte
	err   error
	calls int
}

func (f *fakeFetcher) Fetch(context.Context, string, int64) ([]byte, error) {
	f.calls++
	return f.data, f.err
}

type fakeVault struct {
	uploaded map[string]string
	err      error
}

func (f *fakeVault) Upload(_ context.Context, _, path, mime string, _ []byte) error {
	if f.err != nil {
		return f.err
	}
	f.uploaded[path] = mime
	return nil
}
func (f *fakeVault) SignedURL(_ context.Context, _, path string, _ time.Duration) (string, error) {
	return "https://files.example/" + path, nil
}

type fakeTokens struct{ err error }

func (f fakeTokens) Token(context.Context, string, social.Platform) (social.Tokens, social.Connection, error) {
	return social.Tokens{Access: "tok"}, social.Connection{}, f.err
}

type fakePublisher struct {
	calls  int
	result social.Published
	err    error
	got    social.PublishInput
}

func (f *fakePublisher) Publish(_ context.Context, _ social.Tokens, in social.PublishInput) (social.Published, error) {
	f.calls++
	f.got = in
	return f.result, f.err
}

type recorder struct{ n int }

func (r *recorder) Report(_ context.Context, err error, _ alerts.Context) provider.Class {
	r.n++
	return provider.Classify(err)
}

var mp4 = append([]byte{0, 0, 0, 0x18}, []byte("ftypmp42 padding")...)

type rig struct {
	store  *memStore
	fetch  *fakeFetcher
	vault  *fakeVault
	pub    *fakePublisher
	proc   *Processor
	rec    *recorder
	postID string
}

func newRig(t *testing.T, tokens Tokens) *rig {
	t.Helper()
	store, fetch := newMem(), &fakeFetcher{data: mp4}
	vault, pub, rec := &fakeVault{uploaded: map[string]string{}}, &fakePublisher{result: social.Published{ID: "yt1", URL: "https://youtu.be/yt1"}}, &recorder{}
	proc := &Processor{Store: store, Fetcher: fetch, Vault: vault, Tokens: tokens, Publishers: map[social.Platform]social.Publisher{social.YouTube: pub}, Alerts: rec}
	post, _, err := newService(fakeAccounts{}, store).Schedule(context.Background(), "u1", Request{Platform: social.YouTube, Caption: "hi", JobID: "job-1"}, "")
	if err != nil {
		t.Fatal(err)
	}
	return &rig{store: store, fetch: fetch, vault: vault, pub: pub, proc: proc, rec: rec, postID: post.ID}
}

func (r *rig) post() Post { return *r.store.posts[r.postID] }

func (r *rig) step() { r.proc.Handle(context.Background(), r.post()) }

func TestAPostIsPreparedThenPublishedExactlyOnce(t *testing.T) {
	r := newRig(t, fakeTokens{})
	r.step()
	p := r.post()
	if p.Status != StatusScheduled || !strings.HasSuffix(p.StoragePath, ".mp4") || !strings.HasPrefix(p.StoragePath, "u1/posts/") || r.vault.uploaded[p.StoragePath] != "video/mp4" {
		t.Fatalf("after prepare: %+v uploaded=%v", p, r.vault.uploaded)
	}
	r.step()
	p = r.post()
	if p.Status != StatusPublished || p.ExternalID != "yt1" || p.ExternalURL != "https://youtu.be/yt1" || p.PublishStartedAt == nil || r.pub.calls != 1 {
		t.Fatalf("after publish: %+v calls=%d", p, r.pub.calls)
	}
	if r.pub.got.Caption != "hi" || r.pub.got.MIME != "video/mp4" || len(r.pub.got.Video) == 0 {
		t.Fatalf("publisher was given %+v", r.pub.got)
	}
	r.proc.Handle(context.Background(), p) // a stray repeat of a finished post
	if r.pub.calls != 1 {
		t.Fatal("a published post was sent again")
	}
}

func TestAPostThatMayAlreadyBeOutIsNeverSentAgain(t *testing.T) {
	r := newRig(t, fakeTokens{})
	r.step()
	p := r.post()
	p.Status, p.PublishStartedAt = StatusPublishing, timePtr(time.Now()) // a worker died after calling the platform
	r.store.posts[r.postID] = &p
	r.step()
	got := r.post()
	if got.Status != StatusFailed || !strings.Contains(got.Error, "could not confirm") || r.pub.calls != 0 {
		t.Fatalf("post = %+v calls=%d", got, r.pub.calls)
	}
}

func TestADefiniteRefusalIsExplainedAndAnAmbiguousFailureIsNot(t *testing.T) {
	for name, tc := range map[string]struct {
		err  error
		want string
	}{
		"refused":   {&provider.Error{Provider: "youtube", Status: 403, Message: "YouTube refused the upload."}, "YouTube refused the upload."},
		"timed out": {&provider.Error{Provider: "youtube", Message: "interrupted", Transient: true}, "could not confirm"},
		"unknown":   {errors.New("boom"), "could not confirm"},
	} {
		t.Run(name, func(t *testing.T) {
			r := newRig(t, fakeTokens{})
			r.step()
			r.pub.err = tc.err
			r.step()
			if got := r.post(); got.Status != StatusFailed || !strings.Contains(got.Error, tc.want) || r.pub.calls != 1 {
				t.Fatalf("post = %+v calls=%d", got, r.pub.calls)
			}
			r.step() // never retried
			if r.pub.calls != 1 {
				t.Fatal("a failed post was sent again")
			}
		})
	}
}

func TestSignInProblemsFailWithAClearMessageBeforeAnythingIsSent(t *testing.T) {
	for name, tc := range map[string]struct {
		err  error
		want string
	}{
		"needs sign in": {social.ErrReconnect, "Connect your youtube account again"},
		"disconnected":  {social.ErrNotConnected, "no longer connected"},
	} {
		t.Run(name, func(t *testing.T) {
			r := newRig(t, fakeTokens{err: tc.err})
			r.step()
			r.step()
			if got := r.post(); got.Status != StatusFailed || !strings.Contains(got.Error, tc.want) || r.pub.calls != 0 || got.PublishStartedAt != nil {
				t.Fatalf("post = %+v calls=%d", got, r.pub.calls)
			}
		})
	}
}

func TestTroubleBeforeSendingIsRetriedThenGivenUp(t *testing.T) {
	r := newRig(t, fakeTokens{err: errors.New("network down")})
	r.step() // prepare
	r.step() // token problem
	if got := r.post(); got.Status != StatusScheduled || got.Attempts != 1 || got.NextRunAt == nil || r.pub.calls != 0 {
		t.Fatalf("after one failure: %+v", got)
	}
	r.step()
	r.step()
	if got := r.post(); got.Status != StatusFailed || got.Error != msgUnavailable || r.pub.calls != 0 {
		t.Fatalf("after giving up: %+v", got)
	}
}

func TestAVideoThatCannotBeUsedFailsAtPreparation(t *testing.T) {
	for name, err := range map[string]error{"too large": safenet.ErrTooLarge, "blocked": safenet.ErrBlockedURL} {
		r := newRig(t, fakeTokens{})
		r.fetch.err = err
		r.step()
		if got := r.post(); got.Status != StatusFailed || got.Error != msgUnusable {
			t.Fatalf("%s: %+v", name, got)
		}
	}
	r := newRig(t, fakeTokens{})
	r.fetch.data = []byte("<html>not a video</html>")
	r.step()
	if got := r.post(); got.Status != StatusFailed || got.Error != msgUnusable {
		t.Fatalf("not a video: %+v", got)
	}
}

func TestAPostScheduledForTheFutureWaitsForItsTime(t *testing.T) {
	r := newRig(t, fakeTokens{})
	later := time.Now().Add(48 * time.Hour)
	p := r.post()
	p.ScheduledAt = later
	r.store.posts[r.postID] = &p
	r.step()
	if got := r.post(); got.Status != StatusScheduled || got.NextRunAt == nil || got.NextRunAt.Before(later.Add(-time.Second)) {
		t.Fatalf("next run = %v, want about %v", got.NextRunAt, later)
	}
	r.step() // handled early by mistake: it must wait, not send
	if got := r.post(); got.Status != StatusScheduled || r.pub.calls != 0 || got.PublishStartedAt != nil {
		t.Fatalf("a post was sent before its time: %+v calls=%d", got, r.pub.calls)
	}
}
