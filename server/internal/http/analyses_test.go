package httpserver

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/analysis"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

type fakeAnalyses struct {
	job jobs.Job
	err error
}

func (f *fakeAnalyses) Queue(_ context.Context, _ string, _ analysis.Request, _ string) (jobs.Job, bool, error) {
	return f.result()
}

func (f *fakeAnalyses) StartFetch(_ context.Context, _, raw, _ string) (jobs.Job, bool, error) {
	if _, ok := analysis.ParseLink(raw); !ok {
		return jobs.Job{}, false, analysis.ErrBadLink
	}
	return f.result()
}

func (f *fakeAnalyses) result() (jobs.Job, bool, error) {
	if f.err != nil {
		return jobs.Job{}, false, f.err
	}
	job := f.job
	if job.ID == "" {
		job.ID = "50000000-0000-4000-8000-000000000001"
	}
	return job, true, nil
}

func analysisHarness(t *testing.T, starter *fakeAnalyses) *harness {
	t.Helper()
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.Analyses = starter
	h.rebuild()
	return h
}

func TestSubmitAnalysis(t *testing.T) {
	h := analysisHarness(t, &fakeAnalyses{job: jobs.Job{Status: jobs.StatusQueued, Type: analysis.JobType}})
	token := h.token(t, alice)

	res := h.post("/api/v1/analyses", token, `{"url":"https://www.tiktok.com/@a/video/1"}`)
	if res.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", res.Code, res.Body)
	}
	var body struct {
		Data jobs.Job `json:"data"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &body)
	if body.Data.Type != analysis.JobType {
		t.Fatalf("unexpected job %s", res.Body)
	}

	for name, payload := range map[string]string{
		"empty":      `{}`,
		"not a url":  `{"url":"hello"}`,
		"bad domain": `{"url":"https://evil.example/x"}`,
		"not json":   `nope`,
	} {
		if res := h.post("/api/v1/analyses", token, payload); res.Code != http.StatusBadRequest {
			t.Errorf("%s: expected 400, got %d", name, res.Code)
		}
	}
	if res := h.post("/api/v1/analyses", "", `{"url":"https://www.tiktok.com/@a/video/1"}`); res.Code != http.StatusUnauthorized {
		t.Errorf("missing token: expected 401, got %d", res.Code)
	}
}

func TestSubmitAnalysisRespectsCap(t *testing.T) {
	h := analysisHarness(t, &fakeAnalyses{err: analysis.ErrTooManyBusy})
	res := h.post("/api/v1/analyses", h.token(t, alice), `{"url":"https://www.tiktok.com/@a/video/1"}`)
	if res.Code != http.StatusTooManyRequests || res.Header().Get("Retry-After") == "" {
		t.Fatalf("expected 429 with Retry-After, got %d", res.Code)
	}
}
