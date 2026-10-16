package httpserver

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
)

const readyAvatarID = "50000000-0000-4000-8000-000000000001"

type fakeAvatarVideoCredits struct{ rate int }

func (f fakeAvatarVideoCredits) Quote(_ context.Context, action string) (int, error) {
	if action != credits.ActionAvatarVideoSecond {
		return 0, errors.New("unexpected credit action")
	}
	return f.rate, nil
}

func registerBody(path string) string {
	return `{"storage_path":"` + path + `","name":"Sarah","consent_confirmed":true,"consent_version":1}`
}

func TestHeygenRoutesRequireAuthentication(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	for _, path := range []string{"/api/v1/avatars", "/api/v1/videos/avatar"} {
		if res := h.post(path, "", `{}`); res.Code != http.StatusUnauthorized {
			t.Errorf("POST %s: expected 401, got %d", path, res.Code)
		}
	}
	for _, path := range []string{"/api/v1/avatars", "/api/v1/avatars/" + readyAvatarID, "/api/v1/voices", "/api/v1/videos/" + readyAvatarID} {
		if res := h.get(path, ""); res.Code != http.StatusUnauthorized {
			t.Errorf("GET %s: expected 401, got %d", path, res.Code)
		}
	}
	for _, path := range []string{"/api/v1/avatars/" + readyAvatarID + "/voice", "/api/v1/avatars/" + readyAvatarID + "/consent"} {
		if res := h.post(path, "", `{}`); res.Code != http.StatusUnauthorized {
			t.Errorf("POST %s: expected 401, got %d", path, res.Code)
		}
	}
}

func TestRegisterAvatar(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	token := h.token(t, alice)

	res := h.post("/api/v1/avatars", token, registerBody(avatarFootage), "Idempotency-Key", "k1")
	if res.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", res.Code, res.Body)
	}
	var body struct {
		Data map[string]any `json:"data"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &body)
	if body.Data["status"] != "training" || body.Data["id"] == "" {
		t.Fatalf("unexpected avatar %v", body.Data)
	}
	for _, internal := range []string{"storage_path", "provider", "group", "look", "user_id", "idempotency"} {
		if strings.Contains(strings.ToLower(res.Body.String()), internal) {
			t.Fatalf("internal field %q leaked: %s", internal, res.Body)
		}
	}
	if again := h.post("/api/v1/avatars", token, registerBody(avatarFootage), "Idempotency-Key", "k1"); again.Code != http.StatusOK {
		t.Fatalf("a repeated key should return the original with 200, got %d", again.Code)
	}
}

func TestRegisterAvatarRejectsBadRequests(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	token := h.token(t, alice)
	cases := map[string]struct {
		body   string
		status int
	}{
		"no consent":      {`{"storage_path":"` + avatarFootage + `","consent_version":1}`, http.StatusBadRequest},
		"wrong version":   {`{"storage_path":"` + avatarFootage + `","consent_confirmed":true,"consent_version":9}`, http.StatusBadRequest},
		"foreign file":    {registerBody(bob + "/twin-1b2c3d4e-0000-4000-8000-000000000001.mp4"), http.StatusBadRequest},
		"traversal":       {registerBody(alice + "/../" + bob + "/x.mp4"), http.StatusBadRequest},
		"extra field":     {`{"storage_path":"` + avatarFootage + `","consent_confirmed":true,"consent_version":1,"user_id":"` + bob + `"}`, http.StatusBadRequest},
		"foreign reroute": {`{"storage_path":"` + avatarFootage + `","consent_confirmed":true,"consent_version":1,"reroute_url":"https://evil.example/x"}`, http.StatusBadRequest},
		"not json":        {`nope`, http.StatusBadRequest},
	}
	for name, tc := range cases {
		if res := h.post("/api/v1/avatars", token, tc.body); res.Code != tc.status {
			t.Errorf("%s: expected %d, got %d (%s)", name, tc.status, res.Code, res.Body)
		}
	}
	if len(h.heygen.repo.rows) != 0 {
		t.Fatal("rejected requests must not create avatars")
	}
}

func TestAvatarReadsAreOwnerScoped(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.heygen.seedReady(alice, readyAvatarID)

	if res := h.get("/api/v1/avatars/"+readyAvatarID, h.token(t, alice)); res.Code != http.StatusOK {
		t.Fatalf("own avatar: %d", res.Code)
	}
	foreign := h.get("/api/v1/avatars/"+readyAvatarID, h.token(t, bob))
	missing := h.get("/api/v1/avatars/50000000-0000-4000-8000-0000000000ff", h.token(t, bob))
	if foreign.Code != http.StatusNotFound || foreign.Body.String() != missing.Body.String() {
		t.Fatalf("foreign and missing must look identical: %d %s / %d %s", foreign.Code, foreign.Body, missing.Code, missing.Body)
	}
	var list struct {
		Data []avatars.Avatar `json:"data"`
	}
	res := h.get("/api/v1/avatars", h.token(t, bob))
	_ = json.Unmarshal(res.Body.Bytes(), &list)
	if res.Code != http.StatusOK || len(list.Data) != 0 {
		t.Fatalf("bob listed alice's avatars: %s", res.Body)
	}
	if res := h.get("/api/v1/avatars/not-a-uuid", h.token(t, alice)); res.Code != http.StatusBadRequest {
		t.Fatalf("malformed id: %d", res.Code)
	}
	for _, path := range []string{"/consent", "/voice"} {
		if res := h.post("/api/v1/avatars/"+readyAvatarID+path, h.token(t, bob), `{"voice_id":"lib-1"}`); res.Code != http.StatusNotFound {
			t.Errorf("POST %s as another user: expected 404, got %d", path, res.Code)
		}
	}
}

func TestSelectAvatarVoice(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.heygen.seedReady(alice, readyAvatarID)
	path := "/api/v1/avatars/" + readyAvatarID + "/voice"

	if res := h.post(path, h.token(t, alice), `{"voice_id":"lib-1"}`); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"voice_id":"lib-1"`) {
		t.Fatalf("library voice: %d %s", res.Code, res.Body)
	}
	if res := h.post(path, h.token(t, alice), `{"voice_id":"made-up"}`); res.Code != http.StatusForbidden {
		t.Fatalf("unknown voice: expected 403, got %d", res.Code)
	}
	if res := h.post(path, h.token(t, alice), `{}`); res.Code != http.StatusBadRequest {
		t.Fatalf("missing voice: expected 400, got %d", res.Code)
	}
}

func TestListVoices(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	var body struct {
		Data       []voices.Voice `json:"data"`
		Pagination map[string]any `json:"pagination"`
	}
	res := h.get("/api/v1/voices?limit=10", h.token(t, alice))
	_ = json.Unmarshal(res.Body.Bytes(), &body)
	if res.Code != http.StatusOK || len(body.Data) != 2 || body.Data[0].Scope != voices.ScopeOwn || body.Data[1].Scope != voices.ScopeLibrary {
		t.Fatalf("%d %s", res.Code, res.Body)
	}
	res = h.get("/api/v1/voices", h.token(t, bob))
	_ = json.Unmarshal(res.Body.Bytes(), &body)
	for _, v := range body.Data {
		if v.Scope == voices.ScopeOwn {
			t.Fatalf("bob was shown a voice recorded for alice: %+v", v)
		}
	}
	for _, q := range []string{"limit=0", "limit=500", "gender=other"} {
		if res := h.get("/api/v1/voices?"+q, h.token(t, alice)); res.Code != http.StatusBadRequest {
			t.Errorf("%s: expected 400, got %d", q, res.Code)
		}
	}
}

func TestCreateAvatarVideo(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.heygen.seedReady(alice, readyAvatarID)
	token := h.token(t, alice)
	body := `{"avatar_id":"` + readyAvatarID + `","script":"Hello there"}`

	res := h.post("/api/v1/videos/avatar", token, body, "Idempotency-Key", "v1")
	if res.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", res.Code, res.Body)
	}
	var job struct {
		Data struct {
			ID     string         `json:"id"`
			Status string         `json:"status"`
			Type   string         `json:"type"`
			Input  map[string]any `json:"input"`
		} `json:"data"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &job)
	if job.Data.Status != "queued" || job.Data.Type != "avatar_video" || job.Data.Input["voice_id"] != "voice-own" {
		t.Fatalf("unexpected job %s", res.Body)
	}
	if h.heygen.provider.creates != 0 {
		t.Fatal("the request must return before HeyGen is called")
	}
	if again := h.post("/api/v1/videos/avatar", token, body, "Idempotency-Key", "v1"); again.Code != http.StatusOK {
		t.Fatalf("an idempotent repeat should return 200, got %d", again.Code)
	}
	if len(h.jobs.rows) != 1 {
		t.Fatalf("expected one job, got %d", len(h.jobs.rows))
	}
}

func TestAvatarVideoQuoteUsesTheBillingDuration(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.AvatarVideoCredits = fakeAvatarVideoCredits{rate: 4}
	h.rebuild()
	token := h.token(t, alice)

	res := h.post("/api/v1/videos/avatar/quote", token, `{"script":"`+strings.Repeat("a", 31)+`"}`)
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"credits":12`) || !strings.Contains(res.Body.String(), `"seconds":3`) {
		t.Fatalf("quote: %d %s", res.Code, res.Body)
	}
	if res := h.post("/api/v1/videos/avatar/quote", token, `{"script":" "}`); res.Code != http.StatusBadRequest {
		t.Fatalf("empty script: %d %s", res.Code, res.Body)
	}
	if res := h.post("/api/v1/videos/avatar/quote", token, `{"script":"`+strings.Repeat("a", 3001)+`"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("long script: %d %s", res.Code, res.Body)
	}
	if res := h.post("/api/v1/videos/avatar/quote", "", `{"script":"Hello"}`); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
}

func TestCreateAvatarVideoRejectsBadRequests(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.heygen.seedReady(alice, readyAvatarID)
	h.heygen.repo.rows["50000000-0000-4000-8000-000000000002"] = avatars.Avatar{ID: "50000000-0000-4000-8000-000000000002", UserID: alice, TrainingStatus: "pending"}
	cases := map[string]struct {
		body   string
		token  string
		status int
	}{
		"bad avatar id":    {`{"avatar_id":"x","script":"hi"}`, h.token(t, alice), http.StatusBadRequest},
		"empty script":     {`{"avatar_id":"` + readyAvatarID + `","script":" "}`, h.token(t, alice), http.StatusBadRequest},
		"huge script":      {`{"avatar_id":"` + readyAvatarID + `","script":"` + strings.Repeat("a", 3001) + `"}`, h.token(t, alice), http.StatusBadRequest},
		"unknown field":    {`{"avatar_id":"` + readyAvatarID + `","script":"hi","look_id":"l"}`, h.token(t, alice), http.StatusBadRequest},
		"foreign avatar":   {`{"avatar_id":"` + readyAvatarID + `","script":"hi"}`, h.token(t, bob), http.StatusNotFound},
		"avatar not ready": {`{"avatar_id":"50000000-0000-4000-8000-000000000002","script":"hi"}`, h.token(t, alice), http.StatusConflict},
		"foreign voice":    {`{"avatar_id":"` + readyAvatarID + `","script":"hi","voice_id":"made-up"}`, h.token(t, alice), http.StatusForbidden},
	}
	for name, tc := range cases {
		if res := h.post("/api/v1/videos/avatar", tc.token, tc.body); res.Code != tc.status {
			t.Errorf("%s: expected %d, got %d (%s)", name, tc.status, res.Code, res.Body)
		}
	}
	if len(h.jobs.rows) != 0 {
		t.Fatal("rejected requests must not create jobs")
	}
}

func TestGetAvatarVideoIsOwnerScopedAndRefreshesURL(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.heygen.seedReady(alice, readyAvatarID)
	res := h.post("/api/v1/videos/avatar", h.token(t, alice), `{"avatar_id":"`+readyAvatarID+`","script":"Hello"}`)
	var created struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &created)
	id := created.Data.ID

	if res := h.get("/api/v1/videos/"+id, h.token(t, alice)); res.Code != http.StatusOK {
		t.Fatalf("own video: %d %s", res.Code, res.Body)
	}
	foreign := h.get("/api/v1/videos/"+id, h.token(t, bob))
	missing := h.get("/api/v1/videos/50000000-0000-4000-8000-0000000000ff", h.token(t, bob))
	if foreign.Code != http.StatusNotFound || foreign.Body.String() != missing.Body.String() {
		t.Fatalf("foreign and missing must look identical: %d / %d", foreign.Code, missing.Code)
	}
	if res := h.get("/api/v1/videos/nope", h.token(t, alice)); res.Code != http.StatusBadRequest {
		t.Fatalf("malformed id: %d", res.Code)
	}
}

func heygenCallback(h *harness, body string, sig string) int {
	headers := map[string]string{}
	if sig != "" {
		headers["signature"] = sig
	}
	return callbackTo(h, "/api/v1/callbacks/heygen", body, headers).Code
}

const heygenBody = `{"event_id":"e1","event_type":"avatar_video.success","event_data":{"video_id":"v_1","url":"https://evil.example/fake.mp4","callback_id":"job-1"}}`

func TestHeygenCallbackSignatureAndReconcile(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	rec := &videoRecorder{}
	h.deps.VideoReconciler = rec
	h.deps.HeygenWebhookSecret = func(context.Context) string { return "whsec" }
	h.rebuild()

	if code := heygenCallback(h, heygenBody, heygen.SignWebhook("whsec", []byte(heygenBody))); code != http.StatusOK {
		t.Fatalf("valid signature: %d", code)
	}
	if len(rec.ids) != 1 || rec.ids[0] != "v_1" {
		t.Fatalf("expected reconcile of v_1, got %v", rec.ids)
	}
	for name, sig := range map[string]string{"none": "", "wrong secret": heygen.SignWebhook("other", []byte(heygenBody)), "other body": heygen.SignWebhook("whsec", []byte("x"))} {
		if code := heygenCallback(h, heygenBody, sig); code != http.StatusUnauthorized {
			t.Errorf("%s: expected 401, got %d", name, code)
		}
	}
	if len(rec.ids) != 1 {
		t.Fatalf("rejected callbacks must not reconcile: %v", rec.ids)
	}
}

func TestHeygenCallbackWithoutSecretIsOnlyAHint(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	rec := &videoRecorder{}
	h.deps.VideoReconciler = rec
	h.rebuild()

	if code := heygenCallback(h, heygenBody, ""); code != http.StatusOK || len(rec.ids) != 1 {
		t.Fatalf("code=%d ids=%v", code, rec.ids)
	}
	for _, bad := range []string{``, `nope`, `{"event_data":{}}`} {
		if code := heygenCallback(h, bad, ""); code != http.StatusBadRequest {
			t.Errorf("%q: expected 400, got %d", bad, code)
		}
	}
	if code := heygenCallback(h, strings.Repeat("a", maxHeygenCallbackBody+5), ""); code != http.StatusRequestEntityTooLarge {
		t.Errorf("oversized: got %d", code)
	}
}

type videoRecorder struct{ ids []string }

func (v *videoRecorder) Reconcile(_ context.Context, id string) { v.ids = append(v.ids, id) }

func TestDeleteAvatar(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.heygen.seedReady(alice, readyAvatarID)
	path := "/api/v1/avatars/" + readyAvatarID

	del := func(token string) int {
		req := httptest.NewRequest(http.MethodDelete, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		res := httptest.NewRecorder()
		h.handler.ServeHTTP(res, req)
		return res.Code
	}
	if code := del(h.token(t, bob)); code != http.StatusNoContent {
		t.Fatalf("a foreign delete reveals nothing and removes nothing, got %d", code)
	}
	if _, ok := h.heygen.repo.rows[readyAvatarID]; !ok {
		t.Fatal("another user deleted an avatar")
	}
	h.heygen.provider.deleteErr = errors.New("provider refused")
	if code := del(h.token(t, alice)); code != http.StatusBadGateway {
		t.Fatalf("a provider refusal must be reported, got %d", code)
	}
	if _, ok := h.heygen.repo.rows[readyAvatarID]; !ok {
		t.Fatal("the avatar must stay when HeyGen refuses")
	}
	h.heygen.provider.deleteErr = nil
	if code := del(h.token(t, alice)); code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", code)
	}
	if _, ok := h.heygen.repo.rows[readyAvatarID]; ok {
		t.Fatal("the avatar should be gone")
	}
	if res := h.get("/api/v1/avatars", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("got %d", res.Code)
	}
}

func TestSetDefaultAvatar(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.heygen.seedReady(alice, readyAvatarID)
	path := "/api/v1/avatars/" + readyAvatarID + "/default"
	if res := h.post(path, h.token(t, bob), ``); res.Code != http.StatusNotFound {
		t.Fatalf("foreign: %d", res.Code)
	}
	if res := h.post(path, h.token(t, alice), ``); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"is_default":true`) {
		t.Fatalf("%d %s", res.Code, res.Body)
	}
}
