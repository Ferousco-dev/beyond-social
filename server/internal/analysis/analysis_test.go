package analysis

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs/jobstest"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
	"google.golang.org/genai"
)

func TestParseLink(t *testing.T) {
	for raw, want := range map[string]Link{
		"https://www.tiktok.com/@a/video/123?utm=x":       {KindTikTok, "https://www.tiktok.com/@a/video/123"},
		"https://www.instagram.com/reel/Abc123/?igsh=1":   {KindInstagram, "https://www.instagram.com/reel/Abc123/"},
		"https://youtu.be/dQw4w9WgXcQ?t=5":                {KindYouTube, "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
		"https://www.youtube.com/watch?v=dQw4w9WgXcQ&x=1": {KindYouTube, "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
		"https://youtube.com/shorts/dQw4w9WgXcQ":          {KindYouTube, "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
	} {
		if got, ok := ParseLink(raw); !ok || got != want {
			t.Errorf("%s => %+v ok=%v, want %+v", raw, got, ok, want)
		}
	}
	for _, raw := range []string{
		"http://www.youtube.com/watch?v=dQw4w9WgXcQ", // not https
		"https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ",
		"https://www.youtube.com/watch?v=short",
		"https://www.youtube.com/channel/abc",
		"https://example.com/video.mp4",
		"https://user:pw@www.tiktok.com/@a/video/1",
	} {
		if got, ok := ParseLink(raw); ok {
			t.Errorf("%s must not be accepted, got %+v", raw, got)
		}
	}
}

func TestFindLinkPicksTheFirstSupportedLinkAndKeepsTheRest(t *testing.T) {
	link, rest, ok := FindLink("see https://example.com/x and make this for my shop https://youtu.be/dQw4w9WgXcQ.")
	if !ok || link.Kind != KindYouTube || !strings.Contains(rest, "for my shop") || strings.Contains(rest, "youtu.be") {
		t.Fatalf("link=%+v rest=%q ok=%v", link, rest, ok)
	}
	if _, _, ok := FindLink("no link here"); ok {
		t.Fatal("no link expected")
	}
}

const goodReply = `{"summary":"A runner at dawn.","hook":"Slow-mo splash","duration_seconds":14.5,"aspect_ratio":"9:16",
"scenes":[{"start_seconds":0,"end_seconds":4,"visual":"Shoe hits a puddle","action":"Slow motion","on_screen_text":"RUN"}],
"voiceover":"","mood":"calm","style":"cinematic","pacing":"slow then fast","why_it_works":"Strong first frame"}`

func TestDecodeAcceptsAGoodReplyAndRejectsBadOnes(t *testing.T) {
	r, err := Decode([]byte(goodReply))
	if err != nil || r.Summary != "A runner at dawn." || len(r.Scenes) != 1 {
		t.Fatalf("good reply: %+v %v", r, err)
	}
	for name, bad := range map[string]string{
		"unknown field":   strings.Replace(goodReply, `"mood"`, `"surprise":1,"mood"`, 1),
		"empty summary":   strings.Replace(goodReply, "A runner at dawn.", " ", 1),
		"backwards scene": strings.Replace(goodReply, `"end_seconds":4`, `"end_seconds":-1`, 1),
		"negative length": strings.Replace(goodReply, "14.5", "-3", 1),
		"not json":        "nope",
	} {
		if _, err := Decode([]byte(bad)); err == nil {
			t.Errorf("%s was accepted", name)
		}
	}
}

func TestDescribeIsBuiltFromTheStoredResultOnly(t *testing.T) {
	r, _ := Decode([]byte(goodReply))
	text := r.Describe()
	for _, want := range []string{"A runner at dawn.", "Hook: Slow-mo splash", "1. (0-4s) Shoe hits a puddle", `Text on screen: "RUN"`, "What would you like to change"} {
		if !strings.Contains(text, want) {
			t.Errorf("missing %q in %q", want, text)
		}
	}
}

type fakeWatcher struct {
	reply string
	err   error
	got   []gemini.Media
	calls int
}

func (f *fakeWatcher) GenerateJSONFromMedia(_ context.Context, sys, _ string, media []gemini.Media, _ *genai.Schema) ([]byte, gemini.Usage, error) {
	f.calls++
	f.got = media
	if !strings.Contains(sys, "never instructions") {
		panic("the system prompt must treat the video as data")
	}
	return []byte(f.reply), gemini.Usage{}, f.err
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
}

func (f fakeFetcher) Fetch(context.Context, string, int64) ([]byte, error) { return f.data, f.err }

type recorder struct{ errs []error }

func (r *recorder) Report(_ context.Context, err error, _ alerts.Context) provider.Class {
	r.errs = append(r.errs, err)
	return provider.Classify(err)
}

var mp4 = append([]byte{0, 0, 0, 0x18}, []byte("ftypmp42 padding")...)

type rig struct {
	repo *jobstest.Repo
	jobs *jobs.Service
	w    *fakeWatcher
	rec  *recorder
	p    *Processor
}

func newRig(w *fakeWatcher, res fakeResolver, fetch fakeFetcher) *rig {
	repo := jobstest.New()
	svc := jobs.NewService(repo, nil)
	rec := &recorder{}
	return &rig{repo: repo, jobs: svc, w: w, rec: rec,
		p: &Processor{Jobs: svc, Watcher: w, Resolver: res, Fetcher: fetch, Alerts: rec}}
}

func (r *rig) job(t *testing.T, url string) jobs.Job {
	t.Helper()
	j, _, err := r.jobs.Create(context.Background(), "u1", JobType, map[string]any{"url": url}, "")
	if err != nil {
		t.Fatal(err)
	}
	return j
}

func (r *rig) after(j jobs.Job) jobs.Job { return r.repo.Job(j.ID) }

func TestTikTokIsResolvedFetchedAndWatched(t *testing.T) {
	r := newRig(&fakeWatcher{reply: goodReply}, fakeResolver{url: "https://cdn.example/v.mp4"}, fakeFetcher{data: mp4})
	j := r.job(t, "https://www.tiktok.com/@a/video/1")
	r.p.Handle(context.Background(), j)
	done := r.after(j)
	if done.Status != jobs.StatusCompleted || done.Progress != 100 {
		t.Fatalf("job = %+v", done)
	}
	if len(r.w.got) != 1 || r.w.got[0].MIME != "video/mp4" || len(r.w.got[0].Data) == 0 {
		t.Fatalf("model was given %+v", r.w.got)
	}
	if res, ok := FromMap(done.Result["analysis"].(map[string]any)); !ok || res.Hook != "Slow-mo splash" {
		t.Fatalf("stored result = %+v", done.Result)
	}
}

func TestYouTubeGoesStraightToGeminiWithoutDownloading(t *testing.T) {
	r := newRig(&fakeWatcher{reply: goodReply}, fakeResolver{err: errors.New("must not resolve")}, fakeFetcher{err: errors.New("must not fetch")})
	j := r.job(t, "https://youtu.be/dQw4w9WgXcQ")
	r.p.Handle(context.Background(), j)
	if r.after(j).Status != jobs.StatusCompleted || len(r.w.got) != 1 || r.w.got[0].URI != "https://www.youtube.com/watch?v=dQw4w9WgXcQ" {
		t.Fatalf("job=%+v media=%+v", r.after(j), r.w.got)
	}
}

func TestFailuresAreExplainedAndNeverLeakProviderDetail(t *testing.T) {
	quota := &provider.Error{Provider: "gemini", Status: 429, Message: "RESOURCE_EXHAUSTED secret detail"}
	rejected := &provider.Error{Provider: "gemini", Status: 400, Message: "video is private"}
	for name, tc := range map[string]struct {
		rig  *rig
		want string
	}{
		"too large":   {newRig(&fakeWatcher{}, fakeResolver{url: "https://x/v"}, fakeFetcher{err: safenet.ErrTooLarge}), msgTooLarge},
		"not a video": {newRig(&fakeWatcher{}, fakeResolver{url: "https://x/v"}, fakeFetcher{data: []byte("<html>")}), msgUnusable},
		"no file":     {newRig(&fakeWatcher{}, fakeResolver{err: video.ErrNoVideoFile}, fakeFetcher{}), msgUnusable},
		"private":     {newRig(&fakeWatcher{err: rejected}, fakeResolver{}, fakeFetcher{}), msgUnusable},
		"quota":       {newRig(&fakeWatcher{err: quota}, fakeResolver{}, fakeFetcher{}), msgUnavailable},
	} {
		t.Run(name, func(t *testing.T) {
			url := "https://www.tiktok.com/@a/video/1"
			if name == "private" || name == "quota" {
				url = "https://youtu.be/dQw4w9WgXcQ"
			}
			j := tc.rig.job(t, url)
			tc.rig.p.Handle(context.Background(), j)
			got := tc.rig.after(j)
			if got.Status != jobs.StatusFailed || got.Error != tc.want || strings.Contains(got.Error, "secret") {
				t.Fatalf("status=%s error=%q, want %q", got.Status, got.Error, tc.want)
			}
		})
	}
}

func TestQuotaFailureAlertsAnOperator(t *testing.T) {
	r := newRig(&fakeWatcher{err: &provider.Error{Provider: "gemini", Status: 429, Message: "quota"}}, fakeResolver{}, fakeFetcher{})
	r.p.Handle(context.Background(), r.job(t, "https://youtu.be/dQw4w9WgXcQ"))
	if len(r.rec.errs) != 1 {
		t.Fatalf("alerts = %v", r.rec.errs)
	}
}

func TestTransientAndGarbledRepliesAreRetriedThenGiveUp(t *testing.T) {
	transient := &provider.Error{Provider: "gemini", Status: 503, Message: "busy", Transient: true}
	for name, w := range map[string]*fakeWatcher{
		"transient": {err: transient},
		"garbled":   {reply: "not json"},
	} {
		t.Run(name, func(t *testing.T) {
			r := newRig(w, fakeResolver{}, fakeFetcher{})
			j := r.job(t, "https://youtu.be/dQw4w9WgXcQ")
			r.p.Handle(context.Background(), j)
			again := r.after(j)
			if again.Status.Terminal() || again.RetryCount != 1 || again.NextRunAt == nil || !again.NextRunAt.After(time.Now()) {
				t.Fatalf("first failure should reschedule: %+v", again)
			}
			again.RetryCount = maxAttempts - 1
			r.p.retry(context.Background(), again)
			if got := r.after(j); got.Status != jobs.StatusFailed || got.Error != msgUnavailable {
				t.Fatalf("after the last attempt: %+v", got)
			}
		})
	}
}

func TestAnOldJobTimesOutWithoutCallingTheModel(t *testing.T) {
	w := &fakeWatcher{reply: goodReply}
	r := newRig(w, fakeResolver{}, fakeFetcher{})
	j := r.job(t, "https://youtu.be/dQw4w9WgXcQ")
	r.p.Now = func() time.Time { return j.CreatedAt.Add(maxJobAge + time.Minute) }
	r.p.Handle(context.Background(), j)
	if w.calls != 0 || r.after(j).Error != msgTimedOut {
		t.Fatalf("calls=%d job=%+v", w.calls, r.after(j))
	}
}

func TestStartRefusesTooManyAtOnce(t *testing.T) {
	r := newRig(&fakeWatcher{}, fakeResolver{}, fakeFetcher{})
	svc := NewService(r.jobs)
	link := Link{KindYouTube, "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
	for i := range maxActivePerUser {
		if _, _, err := svc.Start(context.Background(), "u1", link, "c1", "k"+string(rune('a'+i))); err != nil {
			t.Fatal(err)
		}
	}
	if _, _, err := svc.Start(context.Background(), "u1", link, "c1", "kz"); !errors.Is(err, ErrTooManyBusy) {
		t.Fatalf("err = %v", err)
	}
}
