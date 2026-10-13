package social

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

type uploadSeen struct {
	auth, contentType, uploadType, length string
	meta                                  map[string]any
	bytes                                 []byte
}

func fakeUpload(t *testing.T, startStatus, putStatus int, putBody string) (*YouTubeProvider, *uploadSeen) {
	t.Helper()
	seen := &uploadSeen{}
	var srv *httptest.Server
	mux := http.NewServeMux()
	mux.HandleFunc("/start", func(w http.ResponseWriter, r *http.Request) {
		seen.auth, seen.contentType, seen.length = r.Header.Get("Authorization"), r.Header.Get("X-Upload-Content-Type"), r.Header.Get("X-Upload-Content-Length")
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &seen.meta)
		if startStatus >= 300 {
			w.WriteHeader(startStatus)
			return
		}
		w.Header().Set("Location", srv.URL+"/session")
	})
	mux.HandleFunc("/session", func(w http.ResponseWriter, r *http.Request) {
		seen.bytes, _ = io.ReadAll(r.Body)
		w.WriteHeader(putStatus)
		_, _ = w.Write([]byte(putBody))
	})
	// TLS, because the provider refuses to follow an upload address that is not https.
	srv = httptest.NewTLSServer(mux)
	t.Cleanup(srv.Close)
	p := NewYouTube()
	p.http = srv.Client()
	p.uploadURL = srv.URL + "/start"
	return p, seen
}

var clip = PublishInput{Title: "Dawn run", Caption: "Rise early", Visibility: "unlisted", Video: []byte("video-bytes"), MIME: "video/mp4"}

func TestYouTubeUploadOpensASessionDescribesTheVideoAndSendsTheBytes(t *testing.T) {
	p, seen := fakeUpload(t, 200, 200, `{"id":"abc123"}`)
	got, err := p.Publish(context.Background(), Tokens{Access: "tok"}, clip)
	if err != nil || got.ID != "abc123" || got.URL != "https://www.youtube.com/watch?v=abc123" {
		t.Fatalf("published = %+v err=%v", got, err)
	}
	snippet := seen.meta["snippet"].(map[string]any)
	status := seen.meta["status"].(map[string]any)
	if seen.auth != "Bearer tok" || seen.contentType != "video/mp4" || seen.length != "11" || string(seen.bytes) != "video-bytes" ||
		snippet["title"] != "Dawn run" || snippet["description"] != "Rise early" || status["privacyStatus"] != "unlisted" {
		t.Fatalf("seen = %+v", seen)
	}
}

func TestYouTubeTitleFallsBackToTheCaptionAndPrivacyToPublicOnlyForUnknownValues(t *testing.T) {
	if youtubeTitle("", "First line\nsecond") != "First line" || youtubeTitle(" ", "") != "New video" {
		t.Fatal("title fallback")
	}
	if len([]rune(youtubeTitle(string(make([]rune, 300)), ""))) > 100 {
		t.Fatal("title not capped")
	}
	if privacy("private") != "private" || privacy("unlisted") != "unlisted" || privacy("") != "public" || privacy("friends") != "public" {
		t.Fatal("privacy mapping")
	}
}

func TestYouTubeRefusalsAreDefiniteAndAmbiguousFailuresAreTransient(t *testing.T) {
	for name, tc := range map[string]struct {
		start, put int
		body       string
		transient  bool
	}{
		"quota at start":    {403, 200, "", false},
		"expired at start":  {401, 200, "", false},
		"bytes refused":     {200, 400, "", false},
		"server error":      {200, 503, "", true},
		"no id in response": {200, 200, `{}`, true},
	} {
		p, _ := fakeUpload(t, tc.start, tc.put, tc.body)
		_, err := p.Publish(context.Background(), Tokens{Access: "t"}, clip)
		var pe *provider.Error
		if !errors.As(err, &pe) || pe.Transient != tc.transient || pe.Message == "" {
			t.Errorf("%s: err = %v", name, err)
		}
	}
}
