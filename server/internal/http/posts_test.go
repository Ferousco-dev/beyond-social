package httpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/publish"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

type fakePostService struct {
	last publish.Request
	err  error
}

const postID = "60000000-0000-4000-8000-000000000001"

func (f *fakePostService) Schedule(_ context.Context, _ string, r publish.Request, key string) (publish.Post, bool, error) {
	f.last = r
	return publish.Post{ID: postID, Platform: r.Platform, Status: publish.StatusPreparing, ScheduledAt: time.Now()}, key != "again", f.err
}
func (f *fakePostService) List(context.Context, string, int, int) ([]publish.Post, error) {
	return []publish.Post{{ID: postID, Platform: social.YouTube, Status: publish.StatusScheduled}}, nil
}
func (f *fakePostService) Get(context.Context, string, string) (publish.Post, error) {
	return publish.Post{}, nil
}
func (f *fakePostService) Cancel(_ context.Context, user, id string) (publish.Post, error) {
	if user != alice {
		return publish.Post{}, publish.ErrNotFound
	}
	if id == "70000000-0000-4000-8000-000000000001" {
		return publish.Post{}, publish.ErrNotCancellable
	}
	return publish.Post{ID: id, Status: publish.StatusCancelled}, nil
}

func (f *fakePostService) Reschedule(_ context.Context, user, id string, at time.Time) (publish.Post, error) {
	if user != alice {
		return publish.Post{}, publish.ErrNotFound
	}
	if id == "70000000-0000-4000-8000-000000000001" {
		return publish.Post{}, publish.ErrNotReschedulable
	}
	return publish.Post{ID: id, Status: publish.StatusScheduled, ScheduledAt: at}, nil
}

func TestPostEndpoints(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	fake := &fakePostService{}
	h.deps.Posts, h.deps.Media = fake, fakeMedia{}
	h.rebuild()
	a, b := h.token(t, alice), h.token(t, bob)

	if res := send(h, http.MethodGet, "/api/v1/posts", a, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "scheduled") {
		t.Fatalf("list: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodGet, "/api/v1/posts", "", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
	body := `{"platform":"youtube","caption":"hi","job_id":"00000000-0000-4000-8000-000000000009","at":"2026-10-14T18:00:00Z"}`
	if res := send(h, http.MethodPost, "/api/v1/posts", a, body); res.Code != http.StatusAccepted || fake.last.Platform != social.YouTube || fake.last.At == nil {
		t.Fatalf("create: %d %s", res.Code, res.Body)
	}
	media := `{"platform":"tiktok","caption":"hi","media_id":"10000000-0000-4000-8000-000000000001"}`
	if res := send(h, http.MethodPost, "/api/v1/posts", a, media); res.Code != http.StatusAccepted || fake.last.SourceURL != "https://files.example/10000000-0000-4000-8000-000000000001" || fake.last.JobID != "" {
		t.Fatalf("post an uploaded file: %d %s source=%q", res.Code, res.Body, fake.last.SourceURL)
	}
	if res := send(h, http.MethodPost, "/api/v1/posts", b, media); res.Code != http.StatusNotFound {
		t.Fatalf("someone else's file: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/posts", a, `{"platform":"tiktok","job_id":"00000000-0000-4000-8000-000000000009","media_id":"10000000-0000-4000-8000-000000000001"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("both sources: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/posts", a, `{"platform":"youtube","job_id":"not-a-uuid"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("bad job id: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/posts", a, `{"platform":"youtube","surprise":1}`); res.Code != http.StatusBadRequest {
		t.Fatalf("unknown field: %d", res.Code)
	}
	for name, tc := range map[string]struct {
		err  error
		want int
	}{
		"invalid":       {publish.ErrInvalid, http.StatusBadRequest},
		"not connected": {social.ErrNotConnected, http.StatusConflict},
		"reconnect":     {social.ErrReconnect, http.StatusConflict},
	} {
		fake.err = tc.err
		if res := send(h, http.MethodPost, "/api/v1/posts", a, body); res.Code != tc.want {
			t.Errorf("%s: %d", name, res.Code)
		}
	}
	fake.err = nil

	if res := send(h, http.MethodPost, "/api/v1/posts/"+postID+"/cancel", a, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "cancelled") {
		t.Fatalf("cancel: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/posts/"+postID+"/cancel", b, ""); res.Code != http.StatusNotFound {
		t.Fatalf("a stranger cancelled: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/posts/70000000-0000-4000-8000-000000000001/cancel", a, ""); res.Code != http.StatusConflict {
		t.Fatalf("not cancellable: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/posts/nope/cancel", a, ""); res.Code != http.StatusNotFound {
		t.Fatalf("malformed id: %d", res.Code)
	}

	reschedule := `{"at":"2026-11-14T18:00:00Z"}`
	if res := send(h, http.MethodPut, "/api/v1/posts/"+postID, a, reschedule); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "2026-11-14") {
		t.Fatalf("reschedule: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPut, "/api/v1/posts/70000000-0000-4000-8000-000000000001", a, reschedule); res.Code != http.StatusConflict {
		t.Fatalf("not reschedulable: expected 409, got %d", res.Code)
	}
	if res := send(h, http.MethodPut, "/api/v1/posts/"+postID, b, reschedule); res.Code != http.StatusNotFound {
		t.Fatalf("a stranger rescheduled: %d", res.Code)
	}
	if res := send(h, http.MethodPut, "/api/v1/posts/"+postID, a, `{}`); res.Code != http.StatusBadRequest {
		t.Fatalf("missing time: expected 400, got %d", res.Code)
	}
	if res := send(h, http.MethodPut, "/api/v1/posts/nope", a, reschedule); res.Code != http.StatusNotFound {
		t.Fatalf("malformed id: expected 404, got %d", res.Code)
	}
}
