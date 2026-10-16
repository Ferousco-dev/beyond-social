package social

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestVideoStatsReadsCounters(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer token-1" {
			t.Errorf("auth = %q", r.Header.Get("Authorization"))
		}
		if r.URL.Query().Get("id") != "vid-1" || r.URL.Query().Get("part") != "statistics" {
			t.Errorf("query = %q", r.URL.RawQuery)
		}
		_, _ = w.Write([]byte(`{"items":[{"statistics":{"viewCount":"1000","likeCount":"50","commentCount":"5"}}]}`))
	}))
	defer server.Close()

	p := NewYouTube()
	p.http = server.Client()
	stats, err := p.videoStats(context.Background(), server.URL, "token-1", "vid-1")
	if err != nil {
		t.Fatalf("stats: %v", err)
	}
	if stats.Views != 1000 || stats.Likes != 50 || stats.Comments != 5 {
		t.Fatalf("stats = %+v", stats)
	}
}

func TestVideoStatsMissingVideo(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"items":[]}`))
	}))
	defer server.Close()

	p := NewYouTube()
	p.http = server.Client()
	if _, err := p.videoStats(context.Background(), server.URL, "token-1", "nope"); err == nil {
		t.Fatal("expected an error for a video with no statistics")
	}
}
