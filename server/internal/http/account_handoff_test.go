package httpserver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
)

type fakeProfiles struct {
	rows  map[string]accounts.Profile
	calls int
}

func (f *fakeProfiles) Ensure(_ context.Context, id, email, name string) (accounts.Profile, error) {
	f.calls++
	if p, ok := f.rows[id]; ok {
		return p, nil
	}
	p := accounts.Profile{ID: id, Email: email, DisplayName: name, Role: accounts.RoleUser, CreatedAt: time.Now()}
	f.rows[id] = p
	return p, nil
}

func (f *fakeProfiles) MarkGranted(context.Context, string) error { return nil }

type fakeHandoffStore struct {
	tokens map[string]string // hash -> user
	spent  map[string]bool
}

func newFakeHandoffStore() *fakeHandoffStore {
	return &fakeHandoffStore{tokens: map[string]string{}, spent: map[string]bool{}}
}

func (f *fakeHandoffStore) Mint(_ context.Context, userID, hash string, _ time.Time) error {
	f.tokens[hash] = userID
	return nil
}

func (f *fakeHandoffStore) Resolve(_ context.Context, hash string) (string, bool, error) {
	u, ok := f.tokens[hash]
	return u, ok && !f.spent[hash], nil
}

func (f *fakeHandoffStore) Claim(_ context.Context, hash, _ string) (string, bool, error) {
	u, ok := f.tokens[hash]
	if !ok || f.spent[hash] {
		return "", false, nil
	}
	f.spent[hash] = true
	return u, true, nil
}

func TestMeCreatesTheProfileOnFirstUseAndReturnsIt(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	res := h.get("/api/v1/me", h.token(t, alice))
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"credits":0`) || !strings.Contains(res.Body.String(), `"role":"user"`) {
		t.Fatalf("%d %s", res.Code, res.Body)
	}
	if _, ok := h.profiles.rows[alice]; !ok {
		t.Fatal("the profile should have been created on first sight")
	}
}

func TestSuspendedAndDeletedAccountsAreRefusedEverywhere(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	now := time.Now()
	h.profiles.rows[alice] = accounts.Profile{ID: alice, SuspendedAt: &now}
	h.profiles.rows[bob] = accounts.Profile{ID: bob, DeletedAt: &now}

	for _, path := range []string{"/api/v1/me", "/api/v1/jobs", "/api/v1/avatars", "/api/v1/voices"} {
		if res := h.get(path, h.token(t, alice)); res.Code != http.StatusForbidden || !strings.Contains(res.Body.String(), "account_suspended") {
			t.Errorf("%s suspended: %d %s", path, res.Code, res.Body)
		}
		if res := h.get(path, h.token(t, bob)); res.Code != http.StatusForbidden || !strings.Contains(res.Body.String(), "account_deleted") {
			t.Errorf("%s deleted: %d %s", path, res.Code, res.Body)
		}
	}
	if res := h.post("/api/v1/videos/avatar", h.token(t, alice), `{}`); res.Code != http.StatusForbidden {
		t.Errorf("writes are refused too: %d", res.Code)
	}
}

func TestUploadTicketRefusesQuickTimeAndOtherTypes(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	for ct, want := range map[string]int{
		"video/mp4":                  http.StatusOK,
		"video/webm;codecs=vp9,opus": http.StatusOK,
		"video/quicktime":            http.StatusUnsupportedMediaType,
		"image/png":                  http.StatusUnsupportedMediaType,
		"":                           http.StatusUnsupportedMediaType,
	} {
		res := h.post("/api/v1/avatars/uploads", h.token(t, alice), `{"content_type":"`+ct+`"}`)
		if res.Code != want {
			t.Errorf("%q: expected %d, got %d (%s)", ct, want, res.Code, res.Body)
		}
	}
	res := h.post("/api/v1/avatars/uploads", h.token(t, alice), `{"content_type":"video/mp4"}`)
	if !strings.Contains(res.Body.String(), `"path":"`+alice+`/twin-`) || !strings.Contains(res.Body.String(), `"token"`) {
		t.Fatalf("the path must be inside the caller's own folder: %s", res.Body)
	}
	if res := h.post("/api/v1/avatars/uploads", "", `{}`); res.Code != http.StatusUnauthorized {
		t.Fatalf("unauthenticated: %d", res.Code)
	}
}

func TestHandoffFlow(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	res := h.post("/api/v1/avatars/handoffs", h.token(t, alice), ``)
	if res.Code != http.StatusCreated {
		t.Fatalf("mint: %d %s", res.Code, res.Body)
	}
	token := between(res.Body.String(), `"token":"`, `"`)
	if len(token) != 43 {
		t.Fatalf("unexpected token %q", token)
	}
	for hash := range h.handoffs.tokens {
		if hash == token {
			t.Fatal("only the hash of a token may be stored")
		}
	}

	base := "/api/v1/handoffs/" + token
	req := func(method, path, body, origin string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		if origin != "" {
			r.Header.Set("Origin", origin)
		}
		w := httptest.NewRecorder()
		h.handler.ServeHTTP(w, r)
		return w
	}

	if w := req(http.MethodGet, base, "", ""); w.Code != http.StatusNoContent {
		t.Fatalf("a live link should validate: %d", w.Code)
	}
	ticket := req(http.MethodPost, base+"/ticket", `{"content_type":"video/mp4"}`, "https://app.example.com")
	if ticket.Code != http.StatusOK || ticket.Header().Get("Access-Control-Allow-Origin") != "https://app.example.com" {
		t.Fatalf("ticket: %d cors=%q", ticket.Code, ticket.Header().Get("Access-Control-Allow-Origin"))
	}
	path := between(ticket.Body.String(), `"path":"`, `"`)
	if !strings.HasPrefix(path, alice+"/") {
		t.Fatalf("the phone cannot choose its folder: %q", path)
	}
	if w := req(http.MethodPost, base+"/ticket", `{"content_type":"video/quicktime"}`, ""); w.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("quicktime: %d", w.Code)
	}

	if w := req(http.MethodPost, base+"/claim", `{"path":"`+bob+`/twin-1b2c3d4e-0000-4000-8000-000000000001.mp4"}`, ""); w.Code != http.StatusBadRequest {
		t.Fatalf("a recording in someone else's folder must be refused: %d", w.Code)
	}
	if w := req(http.MethodPost, base+"/claim", `{"path":"`+path+`"}`, ""); w.Code != http.StatusNoContent {
		t.Fatalf("claim: %d %s", w.Code, w.Body)
	}
	if len(h.heygen.repo.rows) != 1 {
		t.Fatalf("claiming should register one avatar, got %d", len(h.heygen.repo.rows))
	}
	for _, a := range h.heygen.repo.rows {
		if a.UserID != alice {
			t.Fatalf("the avatar must belong to the token's owner: %q", a.UserID)
		}
	}
	if w := req(http.MethodPost, base+"/claim", `{"path":"`+path+`"}`, ""); w.Code != http.StatusNotFound {
		t.Fatalf("a link works once: %d", w.Code)
	}
	if w := req(http.MethodGet, base, "", ""); w.Code != http.StatusNotFound {
		t.Fatalf("a spent link no longer validates: %d", w.Code)
	}
}

func TestHandoffRoutesGiveOneAnswerForBadLinks(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	var bodies []string
	for _, token := range []string{strings.Repeat("a", 43), "short", strings.Repeat("!", 43)} {
		w := httptest.NewRecorder()
		h.handler.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/v1/handoffs/"+token+"/ticket", strings.NewReader(`{"content_type":"video/mp4"}`)))
		if w.Code != http.StatusNotFound {
			t.Errorf("%q: expected 404, got %d", token, w.Code)
		}
		bodies = append(bodies, w.Body.String())
	}
	if bodies[0] != bodies[1] || bodies[1] != bodies[2] {
		t.Fatalf("unknown and malformed links must look the same: %v", bodies)
	}
}

func TestCORSOnlyForTheFrontendOrigin(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	pre := func(origin string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodOptions, "/api/v1/handoffs/"+strings.Repeat("a", 43)+"/claim", nil)
		r.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		h.handler.ServeHTTP(w, r)
		return w
	}
	if w := pre("https://app.example.com"); w.Code != http.StatusNoContent || w.Header().Get("Access-Control-Allow-Origin") != "https://app.example.com" {
		t.Fatalf("allowed origin: %d %v", w.Code, w.Header())
	}
	if w := pre("https://evil.example"); w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("another origin must get no CORS headers")
	}
	// Authenticated routes are not opened to browsers at all.
	r := httptest.NewRequest(http.MethodOptions, "/api/v1/avatars", nil)
	r.Header.Set("Origin", "https://app.example.com")
	w := httptest.NewRecorder()
	h.handler.ServeHTTP(w, r)
	if w.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("authenticated routes must not send CORS headers")
	}
}

func between(s, start, end string) string {
	i := strings.Index(s, start)
	if i < 0 {
		return ""
	}
	s = s[i+len(start):]
	if j := strings.Index(s, end); j >= 0 {
		return s[:j]
	}
	return s
}
