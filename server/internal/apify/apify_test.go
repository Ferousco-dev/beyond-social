package apify

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

func raws(t *testing.T, items ...string) []json.RawMessage {
	t.Helper()
	out := make([]json.RawMessage, len(items))
	for i, s := range items {
		out[i] = json.RawMessage(s)
	}
	return out
}

const tiktokRowJSON = `{"id":"7301","text":"hello #fyp","webVideoUrl":"https://www.tiktok.com/@alice/video/7301",
 "createTimeISO":"2026-01-02T03:04:05.000Z","playCount":1200,"diggCount":90,"commentCount":4,"shareCount":2,
 "authorMeta":{"name":"alice","nickName":"Alice A"},
 "videoMeta":{"duration":12.5,"coverUrl":"https://p16.tiktokcdn.com/c.jpg","downloadAddr":"https://v16.tiktokcdn.com/v.mp4"},
 "hashtags":[{"name":"fyp"},{"name":""}],"mediaUrls":["https://api.apify.com/v2/key-value-stores/s/records/v.mp4"]}`

func TestNormalizeTikTok(t *testing.T) {
	now := time.Now()
	got, err := Normalize(video.TikTok, raws(t, tiktokRowJSON, tiktokRowJSON), now)
	if err != nil || len(got) != 1 {
		t.Fatalf("expected one deduplicated video, got %d %v", len(got), err)
	}
	v := got[0]
	if v.SourceID != "7301" || v.CreatorHandle != "alice" || v.CreatorName != "Alice A" || v.Caption != "hello #fyp" {
		t.Fatalf("unexpected fields %+v", v)
	}
	if *v.ViewCount != 1200 || *v.DurationSeconds != 12.5 || len(v.Hashtags) != 1 || v.PublishedAt == nil || !v.DiscoveredAt.Equal(now) {
		t.Fatalf("unexpected metrics %+v", v)
	}
	if v.VideoURL != "https://api.apify.com/v2/key-value-stores/s/records/v.mp4" {
		t.Fatalf("hosted mediaUrls should win over downloadAddr, got %q", v.VideoURL)
	}
}

func TestNormalizeLeavesMissingFieldsEmpty(t *testing.T) {
	got, err := Normalize(video.TikTok, raws(t, `{"id":"1","webVideoUrl":"https://www.tiktok.com/@a/video/1"}`), time.Now())
	if err != nil || len(got) != 1 {
		t.Fatalf("%v %d", err, len(got))
	}
	v := got[0]
	if v.ViewCount != nil || v.DurationSeconds != nil || v.PublishedAt != nil || v.ThumbnailURL != "" || v.VideoURL != "" || v.Hashtags == nil {
		t.Fatalf("absent data must stay absent: %+v", v)
	}
}

func TestNormalizeSkipsUnsafeAndUnusableRows(t *testing.T) {
	rows := raws(t,
		`{"id":"1","webVideoUrl":"https://evil.example.com/@a/video/1"}`,
		`{"id":"2","webVideoUrl":"http://www.tiktok.com/@a/video/2"}`,
		`{"id":"3","error":"boom","webVideoUrl":"https://www.tiktok.com/@a/video/3"}`,
		`{"webVideoUrl":"https://www.tiktok.com/@a/video/4"}`,
		`{"id":"5","webVideoUrl":"https://www.tiktok.com/@a/video/5","videoMeta":{"coverUrl":"javascript:alert(1)","downloadAddr":"http://insecure/v.mp4"}}`,
	)
	got, err := Normalize(video.TikTok, rows, time.Now())
	if err != nil || len(got) != 1 || got[0].SourceID != "5" {
		t.Fatalf("unexpected result %+v %v", got, err)
	}
	if got[0].ThumbnailURL != "" || got[0].VideoURL != "" {
		t.Fatalf("non-https media URLs must be dropped: %+v", got[0])
	}
}

func TestNormalizeReportsWhollyMalformedOutput(t *testing.T) {
	_, err := Normalize(video.TikTok, raws(t, `{"id":123}`, `"string"`), time.Now())
	if !errors.Is(err, ErrMalformed) {
		t.Fatalf("expected ErrMalformed, got %v", err)
	}
	if got, err := Normalize(video.TikTok, nil, time.Now()); err != nil || len(got) != 0 {
		t.Fatalf("empty dataset is a valid empty result: %v", err)
	}
}

func TestNormalizeInstagram(t *testing.T) {
	rows := raws(t,
		`{"id":"9","shortCode":"Cabc123","url":"https://www.instagram.com/reel/Cabc123/","caption":"hi","type":"Video",
		  "ownerUsername":"bob","ownerFullName":"Bob","displayUrl":"https://cdn.instagram.com/t.jpg","videoUrl":"https://cdn.instagram.com/v.mp4",
		  "videoDuration":8.2,"videoPlayCount":500,"videoViewCount":400,"likesCount":-1,"commentsCount":3,"timestamp":"2026-02-03T04:05:06.000Z","hashtags":["x"]}`,
		`{"id":"10","shortCode":"Cstill","url":"https://www.instagram.com/p/Cstill/","type":"Image","displayUrl":"https://cdn.instagram.com/s.jpg"}`,
	)
	got, err := Normalize(video.Instagram, rows, time.Now())
	if err != nil || len(got) != 1 {
		t.Fatalf("expected the video only, got %d %v", len(got), err)
	}
	v := got[0]
	if v.SourceID != "Cabc123" || *v.ViewCount != 500 || v.LikeCount != nil || v.CreatorHandle != "bob" || v.VideoURL == "" {
		t.Fatalf("unexpected %+v", v)
	}
}

func TestBuildInput(t *testing.T) {
	tt := BuildInput(Criteria{Platform: video.TikTok, Query: "cats", Limit: 20})
	if tt["searchQueries"].([]string)[0] != "cats" || tt["resultsPerPage"] != 20 || tt["shouldDownloadVideos"] != false || tt["searchSection"] != "/video" {
		t.Fatalf("tiktok search: %v", tt)
	}
	tag := BuildInput(Criteria{Platform: video.TikTok, Query: "#cats", Limit: 5})
	if tag["hashtags"].([]string)[0] != "cats" || tag["searchQueries"] != nil {
		t.Fatalf("tiktok hashtag: %v", tag)
	}
	one := BuildInput(Criteria{Platform: video.TikTok, URL: "https://www.tiktok.com/@a/video/1", Limit: 40, WithVideo: true})
	if one["resultsPerPage"] != 1 || one["shouldDownloadVideos"] != true || one["postURLs"] == nil {
		t.Fatalf("tiktok url: %v", one)
	}
	ig := BuildInput(Criteria{Platform: video.Instagram, Query: "Before & After!", Limit: 10})
	if ig["directUrls"].([]string)[0] != "https://www.instagram.com/explore/tags/beforeafter/" || ig["resultsType"] != "reels" || ig["resultsLimit"] != 10 {
		t.Fatalf("instagram search: %v", ig)
	}
	igURL := BuildInput(Criteria{Platform: video.Instagram, URL: "https://www.instagram.com/reel/C1/", Limit: 10})
	if igURL["resultsType"] != "reels" || igURL["resultsLimit"] != 1 {
		t.Fatalf("instagram url: %v", igURL)
	}
	if (Actors{}).For(video.TikTok) != DefaultTikTokActor || (Actors{Instagram: "me/ig"}).For(video.Instagram) != "me/ig" {
		t.Fatal("actor override broken")
	}
}

func newTestClient(t *testing.T, h http.HandlerFunc) *Client {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return NewClient("tok").WithBaseURL(srv.URL)
}

func TestStartRunBuildsDocumentedRequest(t *testing.T) {
	c := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		if r.Method != http.MethodPost || r.URL.Path != "/actors/clockworks~tiktok-scraper/runs" {
			t.Errorf("unexpected %s %s", r.Method, r.URL.Path)
		}
		q := r.URL.Query()
		if q.Get("maxItems") != "20" || q.Get("maxTotalChargeUsd") != "0.50" || q.Get("timeout") != "120" {
			t.Errorf("unexpected query %v", q)
		}
		if r.Header.Get("Authorization") != "Bearer tok" || r.URL.Query().Get("token") != "" {
			t.Errorf("token must travel in the header only")
		}
		if string(body) != `{"q":1}` {
			t.Errorf("unexpected body %s", body)
		}
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"data":{"id":"run1","status":"READY","defaultDatasetId":"ds1"}}`))
	})
	run, err := c.StartRun(context.Background(), DefaultTikTokActor, map[string]int{"q": 1}, RunOptions{MaxItems: 20, MaxChargeUSD: 0.5, TimeoutSeconds: 120})
	if err != nil || run.ID != "run1" || run.DefaultDatasetID != "ds1" || run.Finished() {
		t.Fatalf("%+v %v", run, err)
	}
}

func TestRunStatusAndItems(t *testing.T) {
	c := newTestClient(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/actor-runs/run1":
			if r.URL.Query().Get("waitForFinish") != "60" {
				t.Errorf("waitForFinish must be capped at 60, got %q", r.URL.Query().Get("waitForFinish"))
			}
			_, _ = w.Write([]byte(`{"data":{"id":"run1","status":"SUCCEEDED","defaultDatasetId":"ds1"}}`))
		case "/datasets/ds1/items":
			if r.URL.Query().Get("limit") != "5" || r.URL.Query().Get("clean") != "true" {
				t.Errorf("unexpected query %v", r.URL.Query())
			}
			_, _ = w.Write([]byte(`[{"id":"1"},{"id":"2"}]`))
		default:
			http.NotFound(w, r)
		}
	})
	run, err := c.GetRun(context.Background(), "run1", 300)
	if err != nil || !run.Finished() || run.Status != StatusSucceeded {
		t.Fatalf("%+v %v", run, err)
	}
	rows, err := c.Items(context.Background(), "ds1", 5)
	if err != nil || len(rows) != 2 {
		t.Fatalf("%d %v", len(rows), err)
	}
}

func TestProviderErrorClassification(t *testing.T) {
	cases := map[int]bool{429: true, 500: true, 503: true, 400: false, 401: false, 402: false, 403: false, 404: false}
	for status, transient := range cases {
		c := newTestClient(t, func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(status)
			_, _ = w.Write([]byte(`{"error":{"message":"secret detail"}}`))
		})
		_, err := c.GetRun(context.Background(), "x", 0)
		if err == nil || provider.IsTransient(err) != transient {
			t.Errorf("status %d: transient=%v err=%v", status, provider.IsTransient(err), err)
		}
	}
}

func TestMalformedAndOversizedResponses(t *testing.T) {
	c := newTestClient(t, func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(`<html>not json`)) })
	if _, err := c.GetRun(context.Background(), "x", 0); err == nil || provider.IsTransient(err) {
		t.Fatalf("malformed body should be a permanent error, got %v", err)
	}
	c = newTestClient(t, func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(`{"data":{}}`)) })
	if _, err := c.StartRun(context.Background(), "a/b", nil, RunOptions{}); err == nil {
		t.Fatal("a run without an id must be rejected")
	}
}

func TestTimeoutAndCancellationAreTransient(t *testing.T) {
	c := newTestClient(t, func(w http.ResponseWriter, r *http.Request) { <-r.Context().Done() })
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	if _, err := c.GetRun(ctx, "x", 0); !provider.IsTransient(err) {
		t.Fatalf("expected transient error on timeout, got %v", err)
	}
}
