package transform

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/apify"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

type fakeAPI struct {
	startErr error
	runs     []apify.Run // returned by successive GetRun calls
	rows     []json.RawMessage
	started  map[string]any
	opts     apify.RunOptions
}

func (f *fakeAPI) StartRun(_ context.Context, _ string, input any, opts apify.RunOptions) (apify.Run, error) {
	f.started, f.opts = input.(map[string]any), opts
	return apify.Run{ID: "run1", Status: apify.StatusRunning, DefaultDatasetID: "ds"}, f.startErr
}

func (f *fakeAPI) GetRun(context.Context, string, int) (apify.Run, error) {
	r := f.runs[0]
	if len(f.runs) > 1 {
		f.runs = f.runs[1:]
	}
	return r, nil
}

func (f *fakeAPI) Items(context.Context, string, int) ([]json.RawMessage, error) { return f.rows, nil }

func TestApifyResolverReturnsFreshHostedFileURL(t *testing.T) {
	api := &fakeAPI{
		runs: []apify.Run{{ID: "run1", Status: apify.StatusRunning}, {ID: "run1", Status: apify.StatusSucceeded, DefaultDatasetID: "ds"}},
		rows: []json.RawMessage{json.RawMessage(`{"id":"1","webVideoUrl":"https://www.tiktok.com/@a/video/1","mediaUrls":["https://api.apify.com/v2/key-value-stores/s/records/v.mp4?signature=x"]}`)},
	}
	u, err := ApifyResolver{API: api}.Resolve(context.Background(), video.TikTok, "https://www.tiktok.com/@a/video/1")
	if err != nil || u != "https://api.apify.com/v2/key-value-stores/s/records/v.mp4?signature=x" {
		t.Fatalf("%q %v", u, err)
	}
	if api.started["shouldDownloadVideos"] != true || api.opts.MaxItems != 1 || api.opts.MaxChargeUSD <= 0 {
		t.Fatalf("the single-video scrape must download the file and cap spend: %v %+v", api.started, api.opts)
	}
}

func TestApifyResolverErrors(t *testing.T) {
	ok := apify.Run{ID: "run1", Status: apify.StatusSucceeded, DefaultDatasetID: "ds"}

	empty := &fakeAPI{runs: []apify.Run{ok}}
	if _, err := (ApifyResolver{API: empty}).Resolve(context.Background(), video.TikTok, "https://www.tiktok.com/@a/video/1"); !errors.Is(err, ErrNoVideoFile) {
		t.Fatalf("expected ErrNoVideoFile, got %v", err)
	}

	failed := &fakeAPI{runs: []apify.Run{{ID: "run1", Status: apify.StatusFailed}}}
	_, err := ApifyResolver{API: failed}.Resolve(context.Background(), video.TikTok, "https://www.tiktok.com/@a/video/1")
	if !provider.IsTransient(err) {
		t.Fatalf("a failed run should be retryable, got %v", err)
	}

	start := &fakeAPI{startErr: &provider.Error{Provider: "apify", Status: 402}}
	if _, err := (ApifyResolver{API: start}).Resolve(context.Background(), video.Instagram, "https://www.instagram.com/reel/C1/"); err == nil {
		t.Fatal("expected start error to propagate")
	}
}
