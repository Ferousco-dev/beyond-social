package discovery

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/apify"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

const (
	alice = "6f1c5a0e-7a53-4d0e-9f56-0a3f6a1b2c3d"
	bob   = "0b5d3c1a-2d4e-4f60-8a71-92b3c4d5e6f7"
)

type memRepo struct {
	mu     sync.Mutex
	rows   map[string]Discovery
	videos map[string][]video.Video // by discovery id
	seq    int
}

func newMemRepo() *memRepo {
	return &memRepo{rows: map[string]Discovery{}, videos: map[string][]video.Video{}}
}

func (m *memRepo) Create(_ context.Context, d Discovery) (Discovery, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.seq++
	d.ID = fmt.Sprintf("d-%d", m.seq)
	d.CreatedAt = time.Now()
	m.rows[d.ID] = d
	return d, nil
}

func (m *memRepo) Get(_ context.Context, userID, id string) (Discovery, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if d, ok := m.rows[id]; ok && d.UserID == userID {
		return d, nil
	}
	return Discovery{}, ErrNotFound
}

func (m *memRepo) ListVideos(_ context.Context, userID, id string, limit, offset int) ([]video.Video, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if d := m.rows[id]; d.UserID != userID {
		return nil, nil
	}
	vs := m.videos[id]
	if offset >= len(vs) {
		return nil, nil
	}
	return vs[offset:min(offset+limit, len(vs))], nil
}

func (m *memRepo) GetVideo(_ context.Context, userID, videoID string) (video.Video, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for id, vs := range m.videos {
		for _, v := range vs {
			if v.ID == videoID && m.rows[id].UserID == userID {
				return v, nil
			}
		}
	}
	return video.Video{}, ErrNotFound
}

func (m *memRepo) CountActive(_ context.Context, userID string) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	n := 0
	for _, d := range m.rows {
		if d.UserID == userID && !d.Status.Terminal() {
			n++
		}
	}
	return n, nil
}

func (m *memRepo) Claim(context.Context, int, time.Duration) ([]Discovery, error) { return nil, nil }

func (m *memRepo) Advance(_ context.Context, id string, u Update) (Discovery, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	d := m.rows[id]
	if d.Status.Terminal() {
		return Discovery{}, ErrFinished
	}
	if u.Status != "" {
		d.Status = u.Status
	}
	if u.RunID != nil {
		d.ApifyRunID = *u.RunID
	}
	if u.Error != "" {
		d.Error = u.Error
	}
	d.RetryCount += u.RetryDelta
	m.rows[id] = d
	return d, nil
}

func (m *memRepo) Complete(_ context.Context, id string, vs []video.Video) (Discovery, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	d := m.rows[id]
	if d.Status.Terminal() {
		return Discovery{}, ErrFinished
	}
	for i := range vs {
		vs[i].ID = fmt.Sprintf("%s-v%d", id, i)
	}
	m.videos[id] = vs
	d.Status, d.ResultCount = StatusCompleted, len(vs)
	m.rows[id] = d
	return d, nil
}

type events struct {
	mu    sync.Mutex
	users []string
}

func (e *events) Publish(userID string, _ realtime.Event) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.users = append(e.users, userID)
}

func TestCreateValidatesAndNormalises(t *testing.T) {
	svc := NewService(newMemRepo(), nil)
	ctx := context.Background()

	d, err := svc.Create(ctx, alice, Params{Platform: video.TikTok, Query: "  cats  "})
	if err != nil || d.Query != "cats" || d.RequestedLimit != DefaultLimit || d.Kind != KindSearch || d.Status != StatusQueued {
		t.Fatalf("%+v %v", d, err)
	}
	d, err = svc.Create(ctx, alice, Params{URL: "https://www.tiktok.com/@a/video/123?utm=x#frag"})
	if err != nil || d.Platform != video.TikTok || d.Kind != KindURL || d.Query != "https://www.tiktok.com/@a/video/123" || d.RequestedLimit != 1 {
		t.Fatalf("%+v %v", d, err)
	}

	bad := map[string]Params{
		"nothing":            {},
		"both":               {Platform: video.TikTok, Query: "x y", URL: "https://www.tiktok.com/@a/video/1"},
		"no platform":        {Query: "cats"},
		"bad platform":       {Platform: "youtube", Query: "cats"},
		"short query":        {Platform: video.TikTok, Query: "a"},
		"long query":         {Platform: video.TikTok, Query: strings.Repeat("a", 81)},
		"control chars":      {Platform: video.TikTok, Query: "ca\x00ts"},
		"limit too high":     {Platform: video.TikTok, Query: "cats", Limit: MaxLimit + 1},
		"negative limit":     {Platform: video.TikTok, Query: "cats", Limit: -1},
		"url wrong site":     {URL: "https://evil.example/@a/video/1"},
		"url internal":       {URL: "https://169.254.169.254/p/abc/"},
		"url not video":      {URL: "https://www.tiktok.com/@a"},
		"url http":           {URL: "http://www.tiktok.com/@a/video/1"},
		"url platform clash": {Platform: video.Instagram, URL: "https://www.tiktok.com/@a/video/1"},
		"url userinfo":       {URL: "https://x@www.tiktok.com/@a/video/1"},
	}
	for name, p := range bad {
		if _, err := svc.Create(ctx, alice, p); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: expected ErrInvalid, got %v", name, err)
		}
	}
}

func TestCreateCapsActiveDiscoveriesAndPublishes(t *testing.T) {
	ev := &events{}
	svc := NewService(newMemRepo(), ev)
	for range maxActivePerUser {
		if _, err := svc.Create(context.Background(), alice, Params{Platform: video.TikTok, Query: "cats"}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := svc.Create(context.Background(), alice, Params{Platform: video.TikTok, Query: "cats"}); !errors.Is(err, ErrTooManyBusy) {
		t.Fatalf("expected ErrTooManyBusy, got %v", err)
	}
	if _, err := svc.Create(context.Background(), bob, Params{Platform: video.TikTok, Query: "cats"}); err != nil {
		t.Fatalf("another user is unaffected: %v", err)
	}
	if len(ev.users) != maxActivePerUser+1 {
		t.Fatalf("expected one event per created discovery, got %d", len(ev.users))
	}
}

func TestOwnershipOnReads(t *testing.T) {
	repo := newMemRepo()
	svc := NewService(repo, nil)
	ctx := context.Background()
	d, _ := svc.Create(ctx, alice, Params{Platform: video.TikTok, Query: "cats"})
	_, _ = repo.Complete(ctx, d.ID, []video.Video{{SourceID: "1"}, {SourceID: "2"}, {SourceID: "3"}})

	if _, err := svc.Get(ctx, bob, d.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("foreign get: %v", err)
	}
	if _, _, err := svc.Videos(ctx, bob, d.ID, 10, 0); !errors.Is(err, ErrNotFound) {
		t.Fatalf("a foreign discovery must be a 404, not an empty page: %v", err)
	}
	vs, more, err := svc.Videos(ctx, alice, d.ID, 2, 0)
	if err != nil || len(vs) != 2 || !more {
		t.Fatalf("page 1: %d %v %v", len(vs), more, err)
	}
	vs, more, _ = svc.Videos(ctx, alice, d.ID, 2, 2)
	if len(vs) != 1 || more {
		t.Fatalf("page 2: %d %v", len(vs), more)
	}
	if _, err := svc.Video(ctx, bob, d.ID+"-v0"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("foreign video: %v", err)
	}
	if v, err := svc.Video(ctx, alice, d.ID+"-v0"); err != nil || v.SourceID != "1" {
		t.Fatalf("own video: %+v %v", v, err)
	}
}

type fakeAPI struct {
	startErr, runErr, itemsErr error
	run                        apify.Run
	rows                       []json.RawMessage
	starts                     int
	input                      any
	opts                       apify.RunOptions
}

func (f *fakeAPI) StartRun(_ context.Context, _ string, input any, opts apify.RunOptions) (apify.Run, error) {
	f.starts++
	f.input, f.opts = input, opts
	return apify.Run{ID: "run1", Status: apify.StatusReady, DefaultDatasetID: "ds1"}, f.startErr
}

func (f *fakeAPI) GetRun(context.Context, string, int) (apify.Run, error) { return f.run, f.runErr }

func (f *fakeAPI) Items(context.Context, string, int) ([]json.RawMessage, error) {
	return f.rows, f.itemsErr
}

const tiktokRow = `{"id":"7301","text":"hi","webVideoUrl":"https://www.tiktok.com/@a/video/7301","videoMeta":{"duration":5}}`

func newProc(repo *memRepo, api *fakeAPI) (*Processor, *events) {
	ev := &events{}
	return NewProcessor(repo, api, apify.Actors{}, ev), ev
}

func queuedDiscovery(t *testing.T, repo *memRepo) Discovery {
	t.Helper()
	d, err := NewService(repo, nil).Create(context.Background(), alice, Params{Platform: video.TikTok, Query: "cats", Limit: 10})
	if err != nil {
		t.Fatal(err)
	}
	return d
}

func TestProcessorRunsToCompletion(t *testing.T) {
	repo, api := newMemRepo(), &fakeAPI{}
	proc, ev := newProc(repo, api)
	ctx := context.Background()
	d := queuedDiscovery(t, repo)

	proc.Handle(ctx, d)
	d = repo.rows[d.ID]
	if d.Status != StatusRunning || d.ApifyRunID != "run1" || api.starts != 1 || api.opts.MaxItems != 10 || api.opts.MaxChargeUSD <= 0 {
		t.Fatalf("after start: %+v starts=%d opts=%+v", d, api.starts, api.opts)
	}

	api.run = apify.Run{ID: "run1", Status: apify.StatusRunning}
	proc.Handle(ctx, d)
	if repo.rows[d.ID].Status != StatusRunning {
		t.Fatal("an unfinished run must not complete the discovery")
	}

	api.run = apify.Run{ID: "run1", Status: apify.StatusSucceeded, DefaultDatasetID: "ds1"}
	api.rows = []json.RawMessage{json.RawMessage(tiktokRow), json.RawMessage(tiktokRow)}
	proc.Handle(ctx, d)
	done := repo.rows[d.ID]
	if done.Status != StatusCompleted || done.ResultCount != 1 || len(repo.videos[d.ID]) != 1 {
		t.Fatalf("completed: %+v videos=%d", done, len(repo.videos[d.ID]))
	}
	for _, u := range ev.users {
		if u != alice {
			t.Fatalf("event for %q", u)
		}
	}
	if api.starts != 1 {
		t.Fatal("the run must be started exactly once")
	}
}

func TestProcessorResumesAfterRestartWithoutRestartingTheRun(t *testing.T) {
	repo, api := newMemRepo(), &fakeAPI{run: apify.Run{ID: "run1", Status: apify.StatusSucceeded, DefaultDatasetID: "ds1"}, rows: []json.RawMessage{json.RawMessage(tiktokRow)}}
	proc, _ := newProc(repo, api)
	d := queuedDiscovery(t, repo)
	d.ApifyRunID = "run1" // as persisted by the previous process

	proc.Handle(context.Background(), d)
	if api.starts != 0 || repo.rows[d.ID].Status != StatusCompleted {
		t.Fatalf("starts=%d status=%s", api.starts, repo.rows[d.ID].Status)
	}
}

func TestProcessorFailureModes(t *testing.T) {
	cases := map[string]struct {
		api  *fakeAPI
		prep func(*Discovery)
		msg  string
	}{
		"run failed":      {&fakeAPI{run: apify.Run{Status: apify.StatusFailed}}, func(d *Discovery) { d.ApifyRunID = "run1" }, msgFailed},
		"run timed out":   {&fakeAPI{run: apify.Run{Status: apify.StatusTimedOut}}, func(d *Discovery) { d.ApifyRunID = "run1" }, msgFailed},
		"run aborted":     {&fakeAPI{run: apify.Run{Status: apify.StatusAborted}}, func(d *Discovery) { d.ApifyRunID = "run1" }, msgFailed},
		"malformed items": {&fakeAPI{run: apify.Run{Status: apify.StatusSucceeded}, rows: []json.RawMessage{json.RawMessage(`{"id":1}`)}}, func(d *Discovery) { d.ApifyRunID = "run1" }, msgFailed},
		"permanent start": {&fakeAPI{startErr: &provider.Error{Provider: "apify", Status: 401, Message: "bad token"}}, func(*Discovery) {}, msgFailed},
		"too old":         {&fakeAPI{}, func(d *Discovery) { d.CreatedAt = time.Now().Add(-maxAge - time.Minute) }, msgTimedOut},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			repo := newMemRepo()
			proc, _ := newProc(repo, tc.api)
			d := queuedDiscovery(t, repo)
			tc.prep(&d)
			proc.Handle(context.Background(), d)
			got := repo.rows[d.ID]
			if got.Status != StatusFailed || got.Error != tc.msg || strings.Contains(got.Error, "token") {
				t.Fatalf("got %+v", got)
			}
		})
	}
}

func TestProcessorRetriesTransientErrorsThenGivesUp(t *testing.T) {
	repo := newMemRepo()
	api := &fakeAPI{startErr: &provider.Error{Provider: "apify", Status: 503, Transient: true}}
	proc, _ := newProc(repo, api)
	d := queuedDiscovery(t, repo)

	for attempt := 1; attempt < maxAttempts; attempt++ {
		proc.Handle(context.Background(), repo.rows[d.ID])
		if got := repo.rows[d.ID]; got.Status == StatusFailed || got.RetryCount != attempt {
			t.Fatalf("attempt %d: %+v", attempt, got)
		}
	}
	proc.Handle(context.Background(), repo.rows[d.ID])
	if got := repo.rows[d.ID]; got.Status != StatusFailed || got.Error != msgUnavailable {
		t.Fatalf("retries must be bounded: %+v", got)
	}
}

func TestProcessorIgnoresFinishedDiscoveries(t *testing.T) {
	repo, api := newMemRepo(), &fakeAPI{run: apify.Run{Status: apify.StatusSucceeded}, rows: []json.RawMessage{json.RawMessage(tiktokRow)}}
	proc, ev := newProc(repo, api)
	d := queuedDiscovery(t, repo)
	d.ApifyRunID = "run1"
	proc.Handle(context.Background(), d)
	before := len(ev.users)
	proc.Handle(context.Background(), d) // a stale copy, handled twice
	if len(ev.users) != before || len(repo.videos[d.ID]) != 1 {
		t.Fatal("handling a finished discovery again must change nothing")
	}
}
