package analysis

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
)

type fakeStored struct {
	got []byte
	err error
}

func (f *fakeStored) StoreVideo(_ context.Context, _, _, _ string, data []byte) (media.Descriptor, error) {
	f.got = data
	return media.Descriptor{ID: "30000000-0000-4000-8000-000000000001"}, f.err
}

func (r *rig) fetchJob(t *testing.T, url string) jobs.Job {
	t.Helper()
	j, _, err := r.jobs.Create(context.Background(), "u1", FetchJobType, map[string]any{"url": url}, "")
	if err != nil {
		t.Fatal(err)
	}
	return j
}

func TestFetchStoresTheVideoForPreviewWithoutCallingTheModel(t *testing.T) {
	r := newRig(&fakeWatcher{}, fakeResolver{url: "https://cdn.example/v.mp4"}, fakeFetcher{data: mp4})
	stored := &fakeStored{}
	r.p.Stored = stored
	j := r.fetchJob(t, "https://www.tiktok.com/@a/video/1")
	r.p.HandleFetch(context.Background(), j)
	done := r.after(j)
	if done.Status != jobs.StatusCompleted || done.Result["media_id"] != "30000000-0000-4000-8000-000000000001" || len(stored.got) == 0 {
		t.Fatalf("job = %+v stored=%d bytes", done, len(stored.got))
	}
	if r.w.calls != 0 {
		t.Fatal("nothing should reach the model before the person approves")
	}
}

func TestFetchLeavesYouTubeToTheModelAndStoresNothing(t *testing.T) {
	r := newRig(&fakeWatcher{}, fakeResolver{err: errors.New("must not resolve")}, fakeFetcher{err: errors.New("must not fetch")})
	r.p.Stored = &fakeStored{err: errors.New("must not store")}
	j := r.fetchJob(t, "https://youtu.be/dQw4w9WgXcQ")
	r.p.HandleFetch(context.Background(), j)
	done := r.after(j)
	if _, has := done.Result["media_id"]; done.Status != jobs.StatusCompleted || has || done.Result["kind"] != "youtube" {
		t.Fatalf("job = %+v", done)
	}
}

func TestFetchFailureIsExplained(t *testing.T) {
	r := newRig(&fakeWatcher{}, fakeResolver{url: "https://x/v"}, fakeFetcher{data: []byte("<html>")})
	r.p.Stored = &fakeStored{}
	j := r.fetchJob(t, "https://www.tiktok.com/@a/video/1")
	r.p.HandleFetch(context.Background(), j)
	if got := r.after(j); got.Status != jobs.StatusFailed || got.Error != msgUnusable {
		t.Fatalf("job = %+v", got)
	}
}

func TestNotesTravelWithTheAnalysisAndAreBounded(t *testing.T) {
	r := newRig(&fakeWatcher{}, fakeResolver{}, fakeFetcher{})
	svc := NewService(r.jobs)
	job, _, err := svc.Queue(context.Background(), "u1", Request{MediaID: "m1", Notes: "  make it about coffee  "}, "k1")
	if err != nil || job.Input["notes"] != "make it about coffee" || job.Input["media_id"] != "m1" {
		t.Fatalf("job=%+v err=%v", job, err)
	}
	if got := prompt(job); !strings.Contains(got, "make it about coffee") {
		t.Fatalf("prompt = %q", got)
	}
	if _, _, err := svc.Queue(context.Background(), "u1", Request{MediaID: "m1", Notes: strings.Repeat("a", MaxNotesRunes+1)}, "k2"); !errors.Is(err, ErrNotesTooLong) {
		t.Fatalf("err = %v", err)
	}
}

func TestStartFetchFollowsShortLinks(t *testing.T) {
	r := newRig(&fakeWatcher{}, fakeResolver{}, fakeFetcher{})
	svc := NewService(r.jobs).WithLinks(staticLinks("https://www.tiktok.com/@a/video/1"))
	job, _, err := svc.StartFetch(context.Background(), "u1", "https://vm.tiktok.com/ZSghhcPD7/", "k1")
	if err != nil || job.Type != FetchJobType || job.Input["url"] != "https://www.tiktok.com/@a/video/1" {
		t.Fatalf("job=%+v err=%v", job, err)
	}
	if _, _, err := NewService(r.jobs).StartFetch(context.Background(), "u1", "https://example.com/x", "k2"); !errors.Is(err, ErrBadLink) {
		t.Fatalf("err = %v", err)
	}
}

type staticLinks string

func (s staticLinks) Resolve(context.Context, string) (string, error) { return string(s), nil }
