package httpserver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

type fakeSocial struct {
	completed []string
	failWith  error
}

func (f *fakeSocial) List(context.Context, string) ([]social.Status, error) {
	return []social.Status{{Platform: social.YouTube, Label: "YouTube", Available: true}}, nil
}
func (f *fakeSocial) Begin(_ context.Context, _ string, p social.Platform) (string, error) {
	if p != social.YouTube {
		return "", social.ErrNotConfigured
	}
	return "https://accounts.example/auth?state=abc", nil
}
func (f *fakeSocial) Complete(_ context.Context, p social.Platform, code, state string) (string, error) {
	f.completed = append(f.completed, string(p)+"|"+code+"|"+state)
	return alice, f.failWith
}
func (f *fakeSocial) Disconnect(_ context.Context, user string, p social.Platform) error {
	if user != alice {
		return social.ErrNotConnected
	}
	return nil
}

func TestSocialEndpoints(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	fake := &fakeSocial{}
	h.deps.Social, h.deps.AppURL = fake, "https://app.example"
	h.rebuild()
	a, b := h.token(t, alice), h.token(t, bob)

	if res := send(h, http.MethodGet, "/api/v1/social", a, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "YouTube") {
		t.Fatalf("list: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodGet, "/api/v1/social", "", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous list: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/social/youtube/connect", a, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "accounts.example") {
		t.Fatalf("connect: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/social/tiktok/connect", a, ""); res.Code != http.StatusConflict {
		t.Fatalf("not set up: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/social/myspace/connect", a, ""); res.Code != http.StatusNotFound {
		t.Fatalf("unknown platform: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/social/youtube", a, ""); res.Code != http.StatusNoContent {
		t.Fatalf("disconnect: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/social/youtube", b, ""); res.Code != http.StatusNotFound {
		t.Fatalf("disconnecting someone else's: %d", res.Code)
	}
}

func browserGet(h *harness, path string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	h.handler.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
	return w
}

func TestTheCallbackNeedsNoSessionAndAlwaysRedirectsIntoTheApp(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	fake := &fakeSocial{}
	h.deps.Social, h.deps.AppURL = fake, "https://app.example"
	h.rebuild()

	res := browserGet(h, "/api/v1/social/callback/youtube?code=c1&state=s1")
	if res.Code != http.StatusFound || res.Header().Get("Location") != "https://app.example/dashboard/connections?platform=youtube&status=connected" {
		t.Fatalf("connected: %d %q", res.Code, res.Header().Get("Location"))
	}
	if len(fake.completed) != 1 || fake.completed[0] != "youtube|c1|s1" {
		t.Fatalf("completed = %v", fake.completed)
	}
	for path, want := range map[string]string{
		"/api/v1/social/callback/youtube?error=access_denied&state=s1": "status=denied",
		"/api/v1/social/callback/youtube":                              "status=failed",
		"/api/v1/social/callback/youtube?code=c1":                      "status=failed",
	} {
		if res := browserGet(h, path); res.Code != http.StatusFound || !strings.Contains(res.Header().Get("Location"), want) {
			t.Errorf("%s => %d %q, want %s", path, res.Code, res.Header().Get("Location"), want)
		}
	}
	fake.failWith = social.ErrBadState
	if res := browserGet(h, "/api/v1/social/callback/youtube?code=c&state=bad"); !strings.Contains(res.Header().Get("Location"), "status=failed") {
		t.Fatalf("a bad state: %q", res.Header().Get("Location"))
	}
}
