package heygen

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

func testClient(t *testing.T, h http.HandlerFunc) *Client {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	return NewClient("secret-key").WithBaseURL(srv.URL)
}

func readJSON(t *testing.T, r *http.Request) map[string]any {
	t.Helper()
	b, _ := io.ReadAll(r.Body)
	var m map[string]any
	_ = json.Unmarshal(b, &m)
	return m
}

func TestCreateDigitalTwinRequestAndResponse(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
		body := readJSON(t, r)
		file, _ := body["file"].(map[string]any)
		if r.Method != http.MethodPost || r.URL.Path != "/avatars" || r.Header.Get("X-Api-Key") != "secret-key" ||
			r.Header.Get("Idempotency-Key") != "avatar-1" || body["type"] != "digital_twin" || body["name"] != "Sarah" ||
			file["type"] != "url" || file["url"] != "https://files.example/footage.mp4" {
			t.Errorf("unexpected request %s %s %v", r.Method, r.URL.Path, body)
		}
		_, _ = w.Write([]byte(`{"data":{"avatar_item":{"id":"look1","status":"processing","default_voice_id":"voice1"},
			"avatar_group":{"id":"group1","status":"processing","consent_status":"pending"}}}`))
	})
	tw, err := c.CreateDigitalTwin(context.Background(), "Sarah", "https://files.example/footage.mp4", "avatar-1")
	if err != nil || tw.GroupID != "group1" || tw.LookID != "look1" || tw.DefaultVoiceID != "voice1" || tw.ConsentStatus != ConsentPending {
		t.Fatalf("%+v %v", tw, err)
	}
}

func TestCreateDigitalTwinRejectsIncompleteResponses(t *testing.T) {
	for _, body := range []string{`{"data":{}}`, `{"data":{"avatar_item":{"id":"l"}}}`, `{"data":{"avatar_group":{"id":"g"}}}`} {
		c := testClient(t, func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(body)) })
		if _, err := c.CreateDigitalTwin(context.Background(), "n", "https://x/y.mp4", "k"); err == nil {
			t.Errorf("expected an error for %s", body)
		}
	}
}

func TestGroupAndLookParsing(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/avatars/group1":
			_, _ = w.Write([]byte(`{"data":{"id":"group1","status":"failed","consent_status":"rejected","default_voice_id":"v","preview_image_url":"https://p/i.png","preview_video_url":"http://insecure/v.mp4",
				"error":{"code":"training_failed","message":"Footage duration must be between 15s and 600s"}}}`))
		case "/avatars/looks/look1":
			_, _ = w.Write([]byte(`{"data":{"id":"look1","status":"completed","default_voice_id":"v2"}}`))
		default:
			http.NotFound(w, r)
		}
	})
	g, err := c.GetGroup(context.Background(), "group1")
	if err != nil || g.Status != StatusFailed || g.ConsentStatus != ConsentRejected || g.ErrorCode != "training_failed" || g.ErrorMessage == "" {
		t.Fatalf("%+v %v", g, err)
	}
	l, err := c.GetLook(context.Background(), "look1")
	if err != nil || l.Status != StatusCompleted || l.DefaultVoiceID != "v2" {
		t.Fatalf("%+v %v", l, err)
	}
}

func TestCreateConsent(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
		body := readJSON(t, r)
		if r.URL.Path != "/avatars/group1/consent" || body["reroute_url"] != "https://app/done" || body["consent_video"] != nil {
			t.Errorf("unexpected %s %v", r.URL.Path, body)
		}
		_, _ = w.Write([]byte(`{"data":{"avatar_group":{"id":"group1"},"url":"https://consent.heygen/abc"}}`))
	})
	u, err := c.CreateConsent(context.Background(), "group1", "https://app/done", "k")
	if err != nil || u != "https://consent.heygen/abc" {
		t.Fatalf("%q %v", u, err)
	}
}

func TestCreateVideoRequestMatchesDocs(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
		body := readJSON(t, r)
		engine, _ := body["engine"].(map[string]any)
		if r.URL.Path != "/videos" || r.Header.Get("Idempotency-Key") != "job-1" || body["type"] != "avatar" || body["avatar_id"] != "look1" ||
			body["voice_id"] != "voice1" || body["script"] != "Hello there" || engine["type"] != "avatar_v" || body["callback_id"] != "job-1" ||
			body["callback_url"] != "https://api/cb" || body["title"] != "T" {
			t.Errorf("unexpected body %v", body)
		}
		_, _ = w.Write([]byte(`{"data":{"video_id":"v_1","status":"waiting","output_format":"mp4"}}`))
	})
	id, err := c.CreateVideo(context.Background(), VideoRequest{AvatarID: "look1", VoiceID: "voice1", Script: "Hello there", Title: "T", CallbackURL: "https://api/cb", CallbackID: "job-1"}, "job-1")
	if err != nil || id != "v_1" {
		t.Fatalf("%q %v", id, err)
	}
}

func TestCreateVideoOmitsCallbackWhenUnset(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
		body := readJSON(t, r)
		if _, ok := body["callback_url"]; ok {
			t.Error("callback_url must be omitted when not configured")
		}
		_, _ = w.Write([]byte(`{"data":{"video_id":"v"}}`))
	})
	if _, err := c.CreateVideo(context.Background(), VideoRequest{AvatarID: "a", VoiceID: "v", Script: "s"}, "k"); err != nil {
		t.Fatal(err)
	}
}

func TestGetVideoParsesAndSanitises(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"data":{"id":"v_1","status":"completed","video_url":"https://files/v.mp4?sig=1","thumbnail_url":"javascript:alert(1)","duration":12.5}}`))
	})
	v, err := c.GetVideo(context.Background(), "v_1")
	if err != nil || v.Status != VideoCompleted || v.VideoURL != "https://files/v.mp4?sig=1" || v.ThumbnailURL != "" || v.DurationSecond != 12.5 {
		t.Fatalf("%+v %v", v, err)
	}
	c = testClient(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"data":{"id":"v_1","status":"failed","failure_code":"no_credit","failure_message":"internal"}}`))
	})
	if v, _ := c.GetVideo(context.Background(), "v_1"); v.Status != VideoFailed || v.FailureCode != "no_credit" {
		t.Fatalf("%+v", v)
	}
}

func TestListAndGetVoices(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/voices":
			q := r.URL.Query()
			if q.Get("type") != "public" || q.Get("limit") != "20" || q.Get("token") != "tok" || q.Get("language") != "English" {
				t.Errorf("unexpected query %v", q)
			}
			_, _ = w.Write([]byte(`{"data":[{"voice_id":"v1","name":"Ava","language":"English","gender":"female","type":"public","preview_audio_url":"https://p/a.mp3"}],"has_more":true,"next_token":"n2"}`))
		case "/voices/ready":
			_, _ = w.Write([]byte(`{"data":{"voice_id":"ready","name":"Mine","status":"complete"}}`))
		case "/voices/cooking":
			_, _ = w.Write([]byte(`{"data":{"voice_id":"cooking","status":"processing"}}`))
		default:
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(`{"error":{"code":"not_found"}}`))
		}
	})
	page, err := c.ListVoices(context.Background(), VoiceQuery{Type: "public", Limit: 20, Token: "tok", Language: "English"})
	if err != nil || len(page.Voices) != 1 || page.Voices[0].ID != "v1" || !page.HasMore || page.NextToken != "n2" || page.Voices[0].PreviewAudioURL == "" {
		t.Fatalf("%+v %v", page, err)
	}
	if v, ok, err := c.GetVoice(context.Background(), "ready"); err != nil || !ok || v.Name != "Mine" {
		t.Fatalf("%+v %v %v", v, ok, err)
	}
	if _, ok, err := c.GetVoice(context.Background(), "cooking"); err != nil || ok {
		t.Fatalf("a clone still processing is not usable: %v %v", ok, err)
	}
	if _, ok, err := c.GetVoice(context.Background(), "missing"); err != nil || ok {
		t.Fatalf("a 404 is a definite no, not an error: %v %v", ok, err)
	}
}

func TestErrorClassificationKeepsCodeAndHidesBody(t *testing.T) {
	for status, transient := range map[int]bool{429: true, 500: true, 503: true, 400: false, 401: false, 402: false, 403: false} {
		c := testClient(t, func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(status)
			_, _ = w.Write([]byte(`{"error":{"code":"some_code","message":"detail"}}`))
		})
		_, err := c.GetVideo(context.Background(), "v")
		if err == nil || provider.IsTransient(err) != transient || provider.Code(err) != "some_code" || HTTPStatus(err) != status {
			t.Errorf("status %d: transient=%v code=%q err=%v", status, provider.IsTransient(err), provider.Code(err), err)
		}
	}
}

func TestMalformedBodyAndTimeouts(t *testing.T) {
	c := testClient(t, func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(`<html>`)) })
	if _, err := c.GetVideo(context.Background(), "v"); err == nil || provider.IsTransient(err) {
		t.Fatalf("malformed body should be permanent: %v", err)
	}
	c = testClient(t, func(w http.ResponseWriter, r *http.Request) { <-r.Context().Done() })
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	if _, err := c.GetVideo(ctx, "v"); !provider.IsTransient(err) {
		t.Fatalf("a timeout should be transient: %v", err)
	}
}

func TestWebhookVerification(t *testing.T) {
	body := []byte(`{"event_id":"e1","event_type":"avatar_video.success","event_data":{"video_id":"v_1","callback_id":"job-1"}}`)
	sig := SignWebhook("whsec", body)
	if err := VerifyWebhook("whsec", body, sig); err != nil {
		t.Fatalf("valid signature rejected: %v", err)
	}
	if err := VerifyWebhook("whsec", body, "  "+sig+"\n"); err != nil {
		t.Fatalf("surrounding whitespace should be tolerated: %v", err)
	}
	for name, err := range map[string]error{
		"wrong secret": VerifyWebhook("other", body, sig),
		"tampered":     VerifyWebhook("whsec", append(body, ' '), sig),
		"empty":        VerifyWebhook("whsec", body, ""),
		"garbage":      VerifyWebhook("whsec", body, "zzzz"),
	} {
		if err == nil {
			t.Errorf("%s: expected rejection", name)
		}
	}
	ref, err := ParseWebhook(body)
	if err != nil || ref.VideoID != "v_1" || ref.CallbackID != "job-1" || ref.EventType != EventVideoSuccess {
		t.Fatalf("%+v %v", ref, err)
	}
	for _, bad := range []string{``, `{}`, `{"event_data":{}}`, `nope`} {
		if _, err := ParseWebhook([]byte(bad)); err == nil {
			t.Errorf("%q should fail", bad)
		}
	}
}

func TestDeleteCallsAndTreatsMissingAsDone(t *testing.T) {
	var gotPaths []string
	status := http.StatusOK
	c := testClient(t, func(w http.ResponseWriter, r *http.Request) {
		gotPaths = append(gotPaths, r.Method+" "+r.URL.Path)
		w.WriteHeader(status)
	})
	if err := c.DeleteAvatarGroup(context.Background(), "g1"); err != nil {
		t.Fatalf("an empty success body must be accepted: %v", err)
	}
	if err := c.DeleteVoice(context.Background(), "v1"); err != nil {
		t.Fatal(err)
	}
	if gotPaths[0] != "DELETE /avatars/g1" || gotPaths[1] != "DELETE /voices/v1" {
		t.Fatalf("unexpected requests %v", gotPaths)
	}
	status = http.StatusNotFound
	if err := c.DeleteAvatarGroup(context.Background(), "gone"); err != nil {
		t.Fatalf("already gone is deleted: %v", err)
	}
	status = http.StatusInternalServerError
	if err := c.DeleteVoice(context.Background(), "v1"); err == nil || !provider.IsTransient(err) {
		t.Fatalf("a server error should surface as transient: %v", err)
	}
}
