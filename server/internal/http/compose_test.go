package httpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/videoedit"
)

type fakeCompose struct {
	seconds  float64
	measure  error
	rewrites int
	edits    []videoedit.Request
}

func (f *fakeCompose) Rewrite(_ context.Context, _ string, req videoedit.RewriteRequest) (string, error) {
	f.rewrites++
	return "Better: " + req.Prompt, nil
}

func (f *fakeCompose) Measure(context.Context, string, string) (float64, error) {
	return f.seconds, f.measure
}

func (f *fakeCompose) Submit(_ context.Context, userID string, r videoedit.Request, _ string) (jobs.Job, bool, error) {
	f.edits = append(f.edits, r)
	return jobs.Job{ID: "job-1", UserID: userID, Type: videoedit.JobType}, true, nil
}

func (f *fakeCompose) EditRate(context.Context) (int, error) { return 6, nil }

func composeHarness(t *testing.T, f *fakeCompose) *harness {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.Compose = f
	h.rebuild()
	return h
}

func TestComposeNeedsSignIn(t *testing.T) {
	h := composeHarness(t, &fakeCompose{})
	if res := h.post("/api/v1/compose/rewrite", "", `{"mode":"edit","prompt":"suit"}`); res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", res.Code)
	}
}

func TestComposeRewriteSuggestsAndIsCapped(t *testing.T) {
	f := &fakeCompose{}
	h := composeHarness(t, f)
	token := h.token(t, alice)
	res := h.post("/api/v1/compose/rewrite", token, `{"mode":"create","prompt":"me at the beach"}`)
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "Better: me at the beach") {
		t.Fatalf("got %d %s", res.Code, res.Body.String())
	}
	for i := 1; i < rewritesPerHour; i++ {
		h.post("/api/v1/compose/rewrite", token, `{"mode":"create","prompt":"x"}`)
	}
	if res := h.post("/api/v1/compose/rewrite", token, `{"mode":"create","prompt":"x"}`); res.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 after %d suggestions, got %d", rewritesPerHour, res.Code)
	}
	if f.rewrites != rewritesPerHour {
		t.Fatalf("the model was called %d times", f.rewrites)
	}
}

func TestComposeEditQuoteIsPricedFromTheMeasuredLength(t *testing.T) {
	h := composeHarness(t, &fakeCompose{seconds: 9.2})
	res := h.get("/api/v1/compose/edit/quote?video_media_id=x", h.token(t, alice))
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"credits":60`) || !strings.Contains(res.Body.String(), `"seconds":10`) {
		t.Fatalf("got %d %s", res.Code, res.Body.String())
	}
}

func TestComposeEditExplainsFileProblems(t *testing.T) {
	h := composeHarness(t, &fakeCompose{measure: media.ErrUnsupported})
	res := h.get("/api/v1/compose/edit/quote?video_media_id=x", h.token(t, alice))
	if res.Code != http.StatusBadRequest || !strings.Contains(res.Body.String(), "unsupported_file") {
		t.Fatalf("got %d %s", res.Code, res.Body.String())
	}
	h = composeHarness(t, &fakeCompose{measure: videoedit.ErrLength})
	if res := h.get("/api/v1/compose/edit/quote?video_media_id=x", h.token(t, alice)); res.Code != http.StatusBadRequest {
		t.Fatalf("too long: %d", res.Code)
	}
}

func TestComposeEditQueuesTheEdit(t *testing.T) {
	f := &fakeCompose{seconds: 8}
	h := composeHarness(t, f)
	res := h.post("/api/v1/compose/edit", h.token(t, alice), `{"video_media_id":"v","prompt":"navy suit"}`, "Idempotency-Key", "abcdefgh12")
	if res.Code != http.StatusAccepted || len(f.edits) != 1 || f.edits[0].Prompt != "navy suit" {
		t.Fatalf("got %d %s %+v", res.Code, res.Body.String(), f.edits)
	}
}

func TestRewriteGateFreesSuggestionsAfterAnHour(t *testing.T) {
	now := time.Date(2026, 11, 23, 9, 0, 0, 0, time.UTC)
	g := newRewriteGate()
	g.now = func() time.Time { return now }
	for i := 0; i < rewritesPerHour; i++ {
		g.allow("u1")
	}
	if ok, wait := g.allow("u1"); ok || wait <= 0 {
		t.Fatalf("allowed past the cap: %v %v", ok, wait)
	}
	if ok, _ := g.allow("u2"); !ok {
		t.Fatal("another person was refused")
	}
	now = now.Add(time.Hour)
	if ok, _ := g.allow("u1"); !ok {
		t.Fatal("still refused an hour later")
	}
}

// doublingPrices is a credit service for a Free member on a 200% plan.
type doublingPrices struct{}

func (doublingPrices) Quote(context.Context, string) (int, error) { return 6, nil }
func (doublingPrices) PriceFor(_ context.Context, _ string, amount int) (int, error) {
	return amount * 2, nil
}

func TestQuotesShowWhatAFreeMemberIsCharged(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.Prices = doublingPrices{}
	h.deps.Scenes = &fakeScenes{}
	h.deps.Compose = &fakeCompose{seconds: 5}
	h.rebuild()
	token := h.token(t, alice)
	if res := h.get("/api/v1/editor/scenes/quote?seconds=5", token); !strings.Contains(res.Body.String(), `"credits":40`) {
		t.Fatalf("scene quote: %d %s", res.Code, res.Body.String())
	}
	if res := h.get("/api/v1/compose/edit/quote?video_media_id=x", token); !strings.Contains(res.Body.String(), `"credits":60`) {
		t.Fatalf("edit quote: %d %s", res.Code, res.Body.String())
	}
}
