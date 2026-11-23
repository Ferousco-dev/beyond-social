package videoedit

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
	"google.golang.org/genai"
)

const (
	videoID   = "11111111-1111-4111-8111-111111111111"
	pictureID = "22222222-2222-4222-8222-222222222222"
)

type fakeFiles struct {
	seconds float64
	err     error
}

func (f fakeFiles) MeasureVideo(_ context.Context, userID, id string) (media.Item, float64, error) {
	if userID != "u1" {
		return media.Item{}, 0, media.ErrNotFound
	}
	return media.Item{ID: id}, f.seconds, f.err
}

func (f fakeFiles) VideoLink(ctx context.Context, userID, id string) (media.VideoSource, error) {
	_, s, err := f.MeasureVideo(ctx, userID, id)
	return media.VideoSource{URL: "https://files.example/" + id, Seconds: s}, err
}

func (f fakeFiles) PictureLinks(_ context.Context, _ string, ids []string) ([]string, error) {
	out := make([]string, len(ids))
	for i, id := range ids {
		out[i] = "https://files.example/" + id
	}
	return out, nil
}

type fakeJobs struct {
	active  int
	created []map[string]any
}

func (f *fakeJobs) Create(_ context.Context, userID, jobType string, input map[string]any, _ string) (jobs.Job, bool, error) {
	f.created = append(f.created, input)
	return jobs.Job{ID: "job-1", UserID: userID, Type: jobType, Input: input}, true, nil
}

func (f *fakeJobs) CountActive(context.Context, string, string) (int, error) { return f.active, nil }

func TestSubmitMeasuresTheVideoOnTheServer(t *testing.T) {
	j := &fakeJobs{}
	svc := NewService(j, fakeFiles{seconds: 9.2})
	// A browser that claims a shorter video is ignored.
	job, _, err := svc.Submit(context.Background(), "u1", Request{VideoMediaID: videoID, Prompt: "put me in a navy suit", Seconds: 3}, "key-12345")
	if err != nil {
		t.Fatal(err)
	}
	req, err := ParseArgs(job.Input)
	if err != nil || req.Seconds != 9.2 || req.BilledSeconds() != 10 {
		t.Fatalf("got %+v %v", req, err)
	}
}

func TestSubmitRefusesLongVideosStrangersAndBusyUsers(t *testing.T) {
	ctx := context.Background()
	r := Request{VideoMediaID: videoID, Prompt: "office background"}
	if _, _, err := NewService(&fakeJobs{}, fakeFiles{seconds: 40}).Submit(ctx, "u1", r, "k"); !errors.Is(err, ErrLength) {
		t.Fatalf("a 40 second video: %v", err)
	}
	if _, _, err := NewService(&fakeJobs{}, fakeFiles{seconds: 9}).Submit(ctx, "u2", r, "k"); !errors.Is(err, media.ErrNotFound) {
		t.Fatalf("someone else's video: %v", err)
	}
	if _, _, err := NewService(&fakeJobs{active: maxActivePerUser}, fakeFiles{seconds: 9}).Submit(ctx, "u1", r, "k"); !errors.Is(err, ErrTooManyBusy) {
		t.Fatalf("busy: %v", err)
	}
	withPictures := r
	withPictures.PictureMediaIDs = []string{pictureID}
	if _, _, err := NewService(&fakeJobs{}, fakeFiles{seconds: 9}).Submit(ctx, "u1", withPictures, "k"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("pictures without a shape: %v", err)
	}
}

func TestParseArgsRefusesUnknownFieldsAndUnmeasuredVideos(t *testing.T) {
	good := Request{VideoMediaID: videoID, Prompt: "x", Seconds: 5}.Args()
	good["price"] = 0.0
	if _, err := ParseArgs(good); !errors.Is(err, ErrInvalid) {
		t.Fatalf("unknown field: %v", err)
	}
	if _, err := ParseArgs(map[string]any{"video_media_id": videoID, "prompt": "x"}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("unmeasured: %v", err)
	}
}

func TestBuildSendsLinksAndKeepsThePersonAsFilmed(t *testing.T) {
	job := jobs.Job{UserID: "u1", Input: Request{VideoMediaID: videoID, PictureMediaIDs: []string{pictureID}, Prompt: "navy suit like the picture", AspectRatio: "9:16", Seconds: 8}.Args()}
	p, err := Builder{Files: fakeFiles{seconds: 8}}.Build(context.Background(), job)
	if err != nil {
		t.Fatal(err)
	}
	if p.Model != Model || p.Input["audio"] != false || p.Input["aspect_ratio"] != "9:16" {
		t.Fatalf("got %+v", p)
	}
	if urls := p.Input["video_urls"].([]string); len(urls) != 1 || !strings.HasSuffix(urls[0], videoID) {
		t.Fatalf("video_urls = %v", urls)
	}
	if prompt := p.Input["prompt"].(string); !strings.HasPrefix(prompt, "navy suit") || !strings.Contains(prompt, "mouth movements") {
		t.Fatalf("prompt = %q", prompt)
	}
	noPictures := jobs.Job{UserID: "u1", Input: Request{VideoMediaID: videoID, Prompt: "office", Seconds: 8}.Args()}
	p, _ = Builder{Files: fakeFiles{seconds: 8}}.Build(context.Background(), noPictures)
	if p.Input["aspect_ratio"] != "auto" || p.Input["image_urls"] != nil {
		t.Fatalf("without pictures: %+v", p.Input)
	}
	_, err = Builder{Files: fakeFiles{err: media.ErrUnsupported}}.Build(context.Background(), noPictures)
	var userErr *transform.UserError
	if !errors.As(err, &userErr) {
		t.Fatalf("a bad file should fail with a message, got %v", err)
	}
}

type fakeWriter struct {
	system, user string
	media        int
	out          string
}

func (f *fakeWriter) GenerateJSONFromMedia(_ context.Context, system, user string, m []gemini.Media, _ *genai.Schema) ([]byte, gemini.Usage, error) {
	f.system, f.user, f.media = system, user, len(m)
	return []byte(`{"prompt":` + f.out + `}`), gemini.Usage{}, nil
}

type fakePictures struct{}

func (fakePictures) Load(_ context.Context, userID, _ string, _ int64) ([]byte, string, error) {
	if userID != "u1" {
		return nil, "", media.ErrNotFound
	}
	return []byte("png"), "image/png", nil
}

func TestRewriteUsesTheRightBriefAndThePictures(t *testing.T) {
	w := &fakeWriter{out: `"Change the singlet to a navy wool suit."`}
	rw := Rewriter{Model: w, Pictures: fakePictures{}}
	got, err := rw.Rewrite(context.Background(), "u1", RewriteRequest{Mode: ModeEdit, Prompt: "make me wear suit", PictureMediaIDs: []string{pictureID}, VideoSeconds: 9})
	if err != nil || got != "Change the singlet to a navy wool suit." {
		t.Fatalf("got %q %v", got, err)
	}
	if w.system != editSystem || w.media != 1 || !strings.Contains(w.user, "make me wear suit") {
		t.Fatalf("sent system=%v media=%d user=%q", w.system == editSystem, w.media, w.user)
	}
	if _, err := rw.Rewrite(context.Background(), "u2", RewriteRequest{Mode: ModeEdit, Prompt: "x", PictureMediaIDs: []string{pictureID}}); !errors.Is(err, media.ErrNotFound) {
		t.Fatalf("someone else's picture: %v", err)
	}
	if _, err := rw.Rewrite(context.Background(), "u1", RewriteRequest{Mode: "other", Prompt: "x"}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("unknown mode: %v", err)
	}
	if _, err := rw.Rewrite(context.Background(), "u1", RewriteRequest{Mode: ModeCreate, Prompt: "  "}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("empty prompt: %v", err)
	}
}
