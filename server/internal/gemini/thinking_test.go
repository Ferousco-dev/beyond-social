package gemini

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
)

// clientWith answers every request with handler and records usage into rec.
func clientWith(t *testing.T, rec Recorder, handler func(call int32, body string) *http.Response) *Client {
	t.Helper()
	var calls int32
	client, err := NewClient(Config{
		APIKey: "test-key", Recorder: rec, FallbackModel: "same",
		Model: "same",
		HTTPClient: &http.Client{Transport: stubTransport{calls: &calls, handler: func(call int32, req *http.Request) *http.Response {
			b, _ := io.ReadAll(req.Body)
			return handler(call, string(b))
		}}},
	})
	if err != nil {
		t.Fatal(err)
	}
	return client
}

func TestEveryCallAsksForShortThinkingAndCountsIt(t *testing.T) {
	rec := &captureRecorder{}
	var sent string
	client := clientWith(t, rec, func(_ int32, body string) *http.Response {
		sent = body
		return jsonResponse(http.StatusOK, `{"candidates":[{"content":{"parts":[{"text":"{}"}],"role":"model"}}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":5,"thoughtsTokenCount":40,"totalTokenCount":55}}`)
	})
	_, usage, err := client.GenerateJSON(context.Background(), "sys", "user", testSchema())
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(sent, `"thinkingLevel":"LOW"`) {
		t.Fatalf("thinking level not sent: %s", sent)
	}
	if usage.ThoughtsTokens != 40 || usage.OutputTokens() != 45 {
		t.Fatalf("usage = %+v", usage)
	}
	if len(rec.got) != 1 || rec.got[0].Usage.OutputTokens() != 45 {
		t.Fatalf("records = %+v", rec.got)
	}
}

func TestAnEmptyAnswerIsStillRecorded(t *testing.T) {
	rec := &captureRecorder{}
	client := clientWith(t, rec, func(int32, string) *http.Response {
		return jsonResponse(http.StatusOK, `{"candidates":[{"content":{"parts":[{"text":"  "}],"role":"model"}}],"usageMetadata":{"promptTokenCount":10,"thoughtsTokenCount":30,"totalTokenCount":40}}`)
	})
	if _, _, err := client.GenerateJSON(context.Background(), "sys", "user", testSchema()); err == nil {
		t.Fatal("an empty answer should fail")
	}
	if len(rec.got) == 0 || rec.got[0].Usage.TotalTokens != 40 {
		t.Fatalf("billed empty answer not recorded: %+v", rec.got)
	}
}

func TestAModelThatRefusesThinkingIsAskedAgainWithoutIt(t *testing.T) {
	var bodies []string
	client := clientWith(t, nil, func(call int32, body string) *http.Response {
		bodies = append(bodies, body)
		if strings.Contains(body, "thinkingLevel") {
			return jsonResponse(http.StatusBadRequest, `{"error":{"code":400,"message":"Thinking level is not supported for this model.","status":"INVALID_ARGUMENT"}}`)
		}
		return jsonResponse(http.StatusOK, planBody)
	})
	if _, _, err := client.GenerateJSON(context.Background(), "sys", "user", testSchema()); err != nil {
		t.Fatal(err)
	}
	if len(bodies) != 2 || strings.Contains(bodies[1], "thinkingLevel") {
		t.Fatalf("expected one retry without thinking, got %d calls", len(bodies))
	}
}

func TestTagKeepsTheUserAndSetsTheFeature(t *testing.T) {
	ctx := WithScope(context.Background(), Scope{UserID: "u1", JobID: "j1"})
	got := ScopeFrom(Tag(ctx, "storyboard"))
	if got.UserID != "u1" || got.JobID != "j1" || got.Purpose != "storyboard" {
		t.Fatalf("scope = %+v", got)
	}
	if job := ScopeFrom(TagJob(context.Background(), "video_analysis", "u2", "j2")); job != (Scope{UserID: "u2", JobID: "j2", Purpose: "video_analysis"}) {
		t.Fatalf("job scope = %+v", job)
	}
}
