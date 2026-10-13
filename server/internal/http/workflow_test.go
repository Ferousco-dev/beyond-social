package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

type fakeReconciler struct{ tasks []string }

func (f *fakeReconciler) Reconcile(_ context.Context, taskID string) {
	f.tasks = append(f.tasks, taskID)
}

type fakeDiscoveries struct {
	rows   map[string]discovery.Discovery
	videos map[string][]video.Video
	seq    int
}

func newFakeDiscoveries() *fakeDiscoveries {
	return &fakeDiscoveries{rows: map[string]discovery.Discovery{}, videos: map[string][]video.Video{}}
}

func (f *fakeDiscoveries) Create(_ context.Context, d discovery.Discovery) (discovery.Discovery, error) {
	f.seq++
	d.ID = fmt.Sprintf("10000000-0000-4000-8000-%012d", f.seq)
	d.CreatedAt = time.Now()
	f.rows[d.ID] = d
	return d, nil
}

func (f *fakeDiscoveries) Get(_ context.Context, userID, id string) (discovery.Discovery, error) {
	if d, ok := f.rows[id]; ok && d.UserID == userID {
		return d, nil
	}
	return discovery.Discovery{}, discovery.ErrNotFound
}

func (f *fakeDiscoveries) ListVideos(_ context.Context, _, id string, limit, offset int) ([]video.Video, error) {
	vs := f.videos[id]
	if offset >= len(vs) {
		return nil, nil
	}
	return vs[offset:min(offset+limit, len(vs))], nil
}

func (f *fakeDiscoveries) GetVideo(_ context.Context, userID, videoID string) (video.Video, error) {
	for id, vs := range f.videos {
		for _, v := range vs {
			if v.ID == videoID && f.rows[id].UserID == userID {
				return v, nil
			}
		}
	}
	return video.Video{}, discovery.ErrNotFound
}

func (f *fakeDiscoveries) CountActive(_ context.Context, userID string) (int, error) {
	n := 0
	for _, d := range f.rows {
		if d.UserID == userID && !d.Status.Terminal() {
			n++
		}
	}
	return n, nil
}

func (f *fakeDiscoveries) Claim(context.Context, int, time.Duration) ([]discovery.Discovery, error) {
	return nil, nil
}
func (f *fakeDiscoveries) Advance(context.Context, string, discovery.Update) (discovery.Discovery, error) {
	return discovery.Discovery{}, nil
}
func (f *fakeDiscoveries) Complete(context.Context, string, []video.Video) (discovery.Discovery, error) {
	return discovery.Discovery{}, nil
}

const (
	videoID = "20000000-0000-4000-8000-000000000001"
)

// seedVideos gives alice a completed discovery with three videos.
func (h *harness) seedVideos() string {
	id := "10000000-0000-4000-8000-0000000000aa"
	h.discoveries.rows[id] = discovery.Discovery{ID: id, UserID: alice, Platform: video.TikTok, Status: discovery.StatusCompleted}
	h.discoveries.videos[id] = []video.Video{
		{ID: videoID, Platform: video.TikTok, SourceID: "1", PageURL: "https://www.tiktok.com/@a/video/1"},
		{ID: "20000000-0000-4000-8000-000000000002", Platform: video.TikTok, SourceID: "2", PageURL: "https://www.tiktok.com/@a/video/2"},
		{ID: "20000000-0000-4000-8000-000000000003", Platform: video.TikTok, SourceID: "3", PageURL: "https://www.tiktok.com/@a/video/3"},
	}
	return id
}

func (h *harness) post(path, token, body string, headers ...string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	res := httptest.NewRecorder()
	h.handler.ServeHTTP(res, req)
	return res
}

func TestWorkflowRoutesRequireAuthentication(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	for _, path := range []string{"/api/v1/discover", "/api/v1/jobs/video-transform"} {
		if res := h.post(path, "", `{}`); res.Code != http.StatusUnauthorized {
			t.Errorf("POST %s: expected 401, got %d", path, res.Code)
		}
	}
	for _, path := range []string{"/api/v1/discover/" + videoID, "/api/v1/discover/" + videoID + "/videos"} {
		if res := h.get(path, ""); res.Code != http.StatusUnauthorized {
			t.Errorf("GET %s: expected 401, got %d", path, res.Code)
		}
	}
}

func TestCreateDiscovery(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	token := h.token(t, alice)

	res := h.post("/api/v1/discover", token, `{"platform":"tiktok","query":"cats","limit":10}`)
	if res.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", res.Code, res.Body)
	}
	var body struct {
		Data discovery.Discovery `json:"data"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &body)
	if body.Data.Status != discovery.StatusQueued || body.Data.UserID != alice || body.Data.RequestedLimit != 10 {
		t.Fatalf("unexpected discovery %+v", body.Data)
	}

	// The owner comes from the token; a body field cannot change it.
	if res := h.post("/api/v1/discover", token, `{"platform":"tiktok","query":"cats","user_id":"`+bob+`"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("unknown fields must be rejected, got %d", res.Code)
	}
	for name, payload := range map[string]string{
		"empty":        `{}`,
		"bad platform": `{"platform":"youtube","query":"cats"}`,
		"bad url":      `{"url":"https://evil.example/x"}`,
		"not json":     `nope`,
		"trailing":     `{"platform":"tiktok","query":"cats"} {}`,
		"huge limit":   `{"platform":"tiktok","query":"cats","limit":1000}`,
	} {
		if res := h.post("/api/v1/discover", token, payload); res.Code != http.StatusBadRequest {
			t.Errorf("%s: expected 400, got %d", name, res.Code)
		}
	}
	if res := h.post("/api/v1/discover", token, `{"platform":"tiktok","query":"`+strings.Repeat("a", 20000)+`"}`); res.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("oversized body: expected 413, got %d", res.Code)
	}
}

func TestDiscoveryRateLimitReturns429(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	token := h.token(t, alice)
	for range 3 {
		h.post("/api/v1/discover", token, `{"platform":"tiktok","query":"cats"}`)
	}
	res := h.post("/api/v1/discover", token, `{"platform":"tiktok","query":"cats"}`)
	if res.Code != http.StatusTooManyRequests || res.Header().Get("Retry-After") == "" {
		t.Fatalf("expected 429 with Retry-After, got %d", res.Code)
	}
}

func TestDiscoveryReadsAreOwnerScoped(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	id := h.seedVideos()

	res := h.get("/api/v1/discover/"+id, h.token(t, alice))
	if res.Code != http.StatusOK {
		t.Fatalf("own discovery: %d", res.Code)
	}
	foreign := h.get("/api/v1/discover/"+id, h.token(t, bob))
	missing := h.get("/api/v1/discover/10000000-0000-4000-8000-0000000000ff", h.token(t, bob))
	if foreign.Code != http.StatusNotFound || foreign.Body.String() != missing.Body.String() {
		t.Fatalf("foreign and missing must look identical: %d %s vs %d %s", foreign.Code, foreign.Body, missing.Code, missing.Body)
	}
	if res := h.get("/api/v1/discover/"+id+"/videos", h.token(t, bob)); res.Code != http.StatusNotFound {
		t.Fatalf("foreign videos: expected 404, got %d", res.Code)
	}
	if res := h.get("/api/v1/discover/not-a-uuid", h.token(t, alice)); res.Code != http.StatusBadRequest {
		t.Fatalf("malformed id: %d", res.Code)
	}
}

func TestListDiscoveryVideosPaginates(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	id := h.seedVideos()

	var body struct {
		Data       []video.Video `json:"data"`
		Pagination pagination    `json:"pagination"`
	}
	res := h.get("/api/v1/discover/"+id+"/videos?limit=2", h.token(t, alice))
	_ = json.Unmarshal(res.Body.Bytes(), &body)
	if res.Code != http.StatusOK || len(body.Data) != 2 || !body.Pagination.HasMore {
		t.Fatalf("page 1: %d %+v", res.Code, body)
	}
	res = h.get("/api/v1/discover/"+id+"/videos?limit=2&offset=2", h.token(t, alice))
	_ = json.Unmarshal(res.Body.Bytes(), &body)
	if len(body.Data) != 1 || body.Pagination.HasMore {
		t.Fatalf("page 2: %+v", body)
	}
}

func TestVideoTransformSubmission(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.seedVideos()
	token := h.token(t, alice)
	payload := `{"video_id":"` + videoID + `","prompt":"make it neon"}`

	res := h.post("/api/v1/jobs/video-transform", token, payload, "Idempotency-Key", "k1")
	if res.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", res.Code, res.Body)
	}
	var first struct {
		Data struct {
			ID     string `json:"id"`
			Status string `json:"status"`
			Type   string `json:"type"`
		} `json:"data"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &first)
	if first.Data.Status != "queued" || first.Data.Type != "video_transform" || first.Data.ID == "" {
		t.Fatalf("unexpected job %s", res.Body)
	}
	if strings.Contains(res.Body.String(), "provider") || strings.Contains(res.Body.String(), "idempotency") {
		t.Fatalf("internal fields leaked: %s", res.Body)
	}

	again := h.post("/api/v1/jobs/video-transform", token, payload, "Idempotency-Key", "k1")
	var second = first
	_ = json.Unmarshal(again.Body.Bytes(), &second)
	if again.Code != http.StatusOK || second.Data.ID != first.Data.ID {
		t.Fatalf("a repeat must return the original job with 200, got %d", again.Code)
	}
	if len(h.jobs.rows) != 1 {
		t.Fatalf("expected one job, got %d", len(h.jobs.rows))
	}
}

func TestVideoTransformRejectsBadRequests(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.seedVideos()
	token := h.token(t, alice)

	cases := map[string]struct {
		body   string
		token  string
		status int
	}{
		"missing video id": {`{}`, token, http.StatusBadRequest},
		"bad video id":     {`{"video_id":"abc"}`, token, http.StatusBadRequest},
		"short prompt":     {`{"video_id":"` + videoID + `","prompt":"a"}`, token, http.StatusBadRequest},
		"extra field":      {`{"video_id":"` + videoID + `","video_url":"https://evil.example/x.mp4"}`, token, http.StatusBadRequest},
		"unknown video":    {`{"video_id":"20000000-0000-4000-8000-0000000000ff"}`, token, http.StatusNotFound},
		"someone else's":   {`{"video_id":"` + videoID + `"}`, h.token(t, bob), http.StatusNotFound},
	}
	for name, tc := range cases {
		if res := h.post("/api/v1/jobs/video-transform", tc.token, tc.body); res.Code != tc.status {
			t.Errorf("%s: expected %d, got %d (%s)", name, tc.status, res.Code, res.Body)
		}
	}
	if len(h.jobs.rows) != 0 {
		t.Fatal("rejected requests must not create jobs")
	}
}

func TestVideoTransformIsCappedPerUser(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.seedVideos()
	token := h.token(t, alice)
	body := `{"video_id":"` + videoID + `"}`
	for range 3 {
		if res := h.post("/api/v1/jobs/video-transform", token, body); res.Code != http.StatusAccepted {
			t.Fatalf("got %d", res.Code)
		}
	}
	if res := h.post("/api/v1/jobs/video-transform", token, body); res.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", res.Code)
	}
}

func callback(h *harness, body string, headers map[string]string) *httptest.ResponseRecorder {
	return callbackTo(h, "/api/v1/callbacks/kie", body, headers)
}

func callbackTo(h *harness, path, body string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewBufferString(body))
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	res := httptest.NewRecorder()
	h.handler.ServeHTTP(res, req)
	return res
}

const callbackBody = `{"code":200,"data":{"taskId":"task_1","state":"success","resultJson":"{\"resultUrls\":[\"https://evil.example/fake.mp4\"]}"}}`

func TestCallbackWithSignatureTriggersReconcileOnly(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.WebhookHMACKey = func(context.Context) string { return "hmac-key" }
	h.rebuild()

	ts := fmt.Sprint(time.Now().Unix())
	res := callback(h, callbackBody, map[string]string{"X-Webhook-Timestamp": ts, "X-Webhook-Signature": kie.SignCallback("hmac-key", "task_1", ts)})
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", res.Code)
	}
	if len(h.reconciler.tasks) != 1 || h.reconciler.tasks[0] != "task_1" {
		t.Fatalf("expected a reconcile of task_1, got %v", h.reconciler.tasks)
	}
}

func TestCallbackRejectsBadSignatures(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.WebhookHMACKey = func(context.Context) string { return "hmac-key" }
	h.rebuild()
	ts := fmt.Sprint(time.Now().Unix())
	stale := fmt.Sprint(time.Now().Add(-time.Hour).Unix())

	cases := map[string]map[string]string{
		"no headers":   {},
		"wrong key":    {"X-Webhook-Timestamp": ts, "X-Webhook-Signature": kie.SignCallback("other", "task_1", ts)},
		"other task":   {"X-Webhook-Timestamp": ts, "X-Webhook-Signature": kie.SignCallback("hmac-key", "task_2", ts)},
		"stale replay": {"X-Webhook-Timestamp": stale, "X-Webhook-Signature": kie.SignCallback("hmac-key", "task_1", stale)},
		"missing sig":  {"X-Webhook-Timestamp": ts},
	}
	for name, headers := range cases {
		if res := callback(h, callbackBody, headers); res.Code != http.StatusUnauthorized {
			t.Errorf("%s: expected 401, got %d", name, res.Code)
		}
	}
	if len(h.reconciler.tasks) != 0 {
		t.Fatalf("rejected callbacks must not reconcile anything: %v", h.reconciler.tasks)
	}
}

func TestCallbackMalformedAndOversizedBodies(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	for name, body := range map[string]string{"empty": ``, "not json": `nope`, "no task": `{"data":{}}`} {
		if res := callback(h, body, nil); res.Code != http.StatusBadRequest {
			t.Errorf("%s: expected 400, got %d", name, res.Code)
		}
	}
	if res := callback(h, strings.Repeat("a", maxCallbackBody+10), nil); res.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("oversized: expected 413, got %d", res.Code)
	}
}
