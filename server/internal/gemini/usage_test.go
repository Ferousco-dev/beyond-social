package gemini

import (
	"context"
	"net/http"
	"testing"
)

type captureRecorder struct{ got []Record }

func (c *captureRecorder) RecordUsage(_ context.Context, r Record) { c.got = append(c.got, r) }

func newRecordingClient(t *testing.T, status int, rec Recorder) *Client {
	t.Helper()
	var calls int32
	client, err := NewClient(Config{
		APIKey:   "test-key",
		Recorder: rec,
		HTTPClient: &http.Client{Transport: stubTransport{calls: &calls, handler: func(_ int32, _ *http.Request) *http.Response {
			if status != http.StatusOK {
				return jsonResponse(status, `{"error":{"code":400,"message":"bad","status":"INVALID_ARGUMENT"}}`)
			}
			return jsonResponse(status, planBody)
		}}},
	})
	if err != nil {
		t.Fatal(err)
	}
	return client
}

func TestSuccessfulCallRecordsUsageWithScope(t *testing.T) {
	rec := &captureRecorder{}
	client := newRecordingClient(t, http.StatusOK, rec)
	ctx := WithScope(context.Background(), Scope{UserID: "u1", JobID: "j1", Purpose: "plan"})
	if _, _, err := client.GenerateJSON(ctx, "sys", "user", testSchema()); err != nil {
		t.Fatal(err)
	}
	if len(rec.got) != 1 {
		t.Fatalf("want one record, got %d", len(rec.got))
	}
	r := rec.got[0]
	if r.Provider != "gemini" || r.Model != DefaultModel || r.UserID != "u1" || r.JobID != "j1" || r.Purpose != "plan" {
		t.Fatalf("wrong scope or identity: %+v", r)
	}
	if r.Usage.PromptTokens != 10 || r.Usage.CandidatesTokens != 5 || r.Usage.TotalTokens != 15 {
		t.Fatalf("wrong tokens: %+v", r.Usage)
	}
}

func TestFailedCallRecordsNothing(t *testing.T) {
	rec := &captureRecorder{}
	client := newRecordingClient(t, http.StatusBadRequest, rec)
	if _, _, err := client.GenerateJSON(context.Background(), "sys", "user", testSchema()); err == nil {
		t.Fatal("expected an error")
	}
	if len(rec.got) != 0 {
		t.Fatalf("a failed call must not record usage, got %+v", rec.got)
	}
}
