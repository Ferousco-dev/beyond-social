package httpserver

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/insights"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

type fakeInsights struct {
	latest  insights.Metrics
	history []insights.Metrics
	slots   []insights.Slot
	err     error
	empty   bool
}

func (f *fakeInsights) Latest(_ context.Context, _, _ string) (insights.Metrics, error) {
	if f.err != nil {
		return insights.Metrics{}, f.err
	}
	if f.empty {
		return insights.Metrics{}, insights.ErrNoMetrics
	}
	return f.latest, nil
}

func (f *fakeInsights) History(_ context.Context, _, _ string) ([]insights.Metrics, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.history, nil
}

func (f *fakeInsights) Recommend(_ context.Context, _ string, _ social.Platform) ([]insights.Slot, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.slots, nil
}

func insightsHarness(t *testing.T, svc *fakeInsights) *harness {
	t.Helper()
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.Insights = svc
	h.rebuild()
	return h
}

const metricPostID = "70000000-0000-4000-8000-000000000001"

func TestPostMetrics(t *testing.T) {
	h := insightsHarness(t, &fakeInsights{
		latest:  insights.Metrics{PostID: metricPostID, Views: 100, Likes: 10},
		history: []insights.Metrics{{PostID: metricPostID, Views: 50}},
	})
	token := h.token(t, alice)

	res := h.get("/api/v1/posts/"+metricPostID+"/metrics", token)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body)
	}
	if res := h.get("/api/v1/posts/"+metricPostID+"/metrics", ""); res.Code != http.StatusUnauthorized {
		t.Errorf("missing token: expected 401, got %d", res.Code)
	}
	if res := h.get("/api/v1/posts/nope/metrics", token); res.Code != http.StatusNotFound {
		t.Errorf("malformed id: expected 404, got %d", res.Code)
	}

	empty := insightsHarness(t, &fakeInsights{empty: true})
	res = empty.get("/api/v1/posts/"+metricPostID+"/metrics", empty.token(t, alice))
	if res.Code != http.StatusOK {
		t.Fatalf("no metrics yet: expected 200, got %d", res.Code)
	}
}

func TestInsightSlots(t *testing.T) {
	h := insightsHarness(t, &fakeInsights{
		slots: []insights.Slot{{Weekday: time.Monday, Hour: 18, Score: 0.11, Posts: 3}},
	})
	token := h.token(t, alice)

	res := h.get("/api/v1/insights/slots?platform=youtube", token)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body)
	}
	if res := h.get("/api/v1/insights/slots?platform=myspace", token); res.Code != http.StatusBadRequest {
		t.Errorf("bad platform: expected 400, got %d", res.Code)
	}
	if res := h.get("/api/v1/insights/slots", token); res.Code != http.StatusBadRequest {
		t.Errorf("missing platform: expected 400, got %d", res.Code)
	}

	thin := insightsHarness(t, &fakeInsights{})
	res = thin.get("/api/v1/insights/slots?platform=tiktok", thin.token(t, alice))
	if res.Code != http.StatusOK {
		t.Fatalf("thin history: expected 200 with empty slots, got %d", res.Code)
	}
}
