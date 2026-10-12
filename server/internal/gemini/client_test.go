package gemini

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"

	"google.golang.org/genai"
)

type stubTransport struct {
	calls   *int32
	handler func(call int32, req *http.Request) *http.Response
}

func (s stubTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// A real transport fails cancelled requests; the stub honours that too.
	select {
	case <-req.Context().Done():
		return nil, req.Context().Err()
	default:
	}
	call := atomic.AddInt32(s.calls, 1)
	return s.handler(call, req), nil
}

func jsonResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     http.Header{"Content-Type": []string{"application/json"}},
	}
}

const planBody = `{"candidates":[{"content":{"parts":[{"text":"{\"version\":1}"}],"role":"model"}}],"usageMetadata":{"promptTokenCount":10,"candidatesTokenCount":5,"totalTokenCount":15}}`

func testSchema() *genai.Schema {
	return &genai.Schema{Type: genai.TypeObject}
}

func TestNewClientRequiresAPIKey(t *testing.T) {
	if _, err := NewClient(Config{}); err == nil {
		t.Fatal("expected error for missing API key")
	}
}

func TestGenerateJSONSuccess(t *testing.T) {
	var calls int32
	client, err := NewClient(Config{
		APIKey: "test-key",
		HTTPClient: &http.Client{Transport: stubTransport{
			calls: &calls,
			handler: func(_ int32, _ *http.Request) *http.Response {
				return jsonResponse(http.StatusOK, planBody)
			},
		}},
	})
	if err != nil {
		t.Fatalf("new client: %v", err)
	}
	data, usage, err := client.GenerateJSON(context.Background(), "system", "user", testSchema())
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if string(data) != `{"version":1}` {
		t.Fatalf("unexpected body: %s", data)
	}
	if usage.TotalTokens != 15 || usage.PromptTokens != 10 {
		t.Fatalf("unexpected usage: %+v", usage)
	}
	if calls != 1 {
		t.Fatalf("expected 1 call, got %d", calls)
	}
}

func TestGenerateJSONRetriesRateLimit(t *testing.T) {
	var calls int32
	client, _ := NewClient(Config{
		APIKey: "test-key",
		HTTPClient: &http.Client{Transport: stubTransport{
			calls: &calls,
			handler: func(call int32, _ *http.Request) *http.Response {
				if call == 1 {
					return jsonResponse(http.StatusTooManyRequests, `{"error":{"code":429,"message":"slow down"}}`)
				}
				return jsonResponse(http.StatusOK, planBody)
			},
		}},
	})
	if _, _, err := client.GenerateJSON(context.Background(), "system", "user", testSchema()); err != nil {
		t.Fatalf("generate after retry: %v", err)
	}
	if calls != 2 {
		t.Fatalf("expected 2 calls, got %d", calls)
	}
}

func TestGenerateJSONNoRetryOnBadRequest(t *testing.T) {
	var calls int32
	client, _ := NewClient(Config{
		APIKey: "test-key",
		HTTPClient: &http.Client{Transport: stubTransport{
			calls: &calls,
			handler: func(_ int32, _ *http.Request) *http.Response {
				return jsonResponse(http.StatusBadRequest, `{"error":{"code":400,"message":"bad"}}`)
			},
		}},
	})
	if _, _, err := client.GenerateJSON(context.Background(), "system", "user", testSchema()); err == nil {
		t.Fatal("expected error for bad request")
	}
	if calls != 1 {
		t.Fatalf("expected 1 call, got %d", calls)
	}
}

func TestGenerateJSONEmptyResponse(t *testing.T) {
	client, _ := NewClient(Config{
		APIKey: "test-key",
		HTTPClient: &http.Client{Transport: stubTransport{
			calls: new(int32),
			handler: func(_ int32, _ *http.Request) *http.Response {
				return jsonResponse(http.StatusOK, `{"candidates":[]}`)
			},
		}},
	})
	if _, _, err := client.GenerateJSON(context.Background(), "system", "user", testSchema()); err == nil {
		t.Fatal("expected error for empty response")
	}
}

func TestGenerateJSONCancelledContext(t *testing.T) {
	client, _ := NewClient(Config{
		APIKey: "test-key",
		HTTPClient: &http.Client{Transport: stubTransport{
			calls: new(int32),
			handler: func(_ int32, _ *http.Request) *http.Response {
				return jsonResponse(http.StatusServiceUnavailable, `{"error":{"code":503}}`)
			},
		}},
	})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, _, err := client.GenerateJSON(ctx, "system", "user", testSchema())
	if err == nil {
		t.Fatal("expected error for cancelled context")
	}
	if !errors.Is(err, context.Canceled) && !strings.Contains(err.Error(), "cancelled") {
		t.Fatalf("expected cancellation error, got: %v", err)
	}
}

func TestGenerateJSONFromMediaSendsBytesAndLinksBeforeThePrompt(t *testing.T) {
	var calls int32
	var body string
	client, err := NewClient(Config{
		APIKey: "k",
		HTTPClient: &http.Client{Transport: stubTransport{
			calls: &calls,
			handler: func(_ int32, req *http.Request) *http.Response {
				raw, _ := io.ReadAll(req.Body)
				body = string(raw)
				return jsonResponse(http.StatusOK, planBody)
			},
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	media := []Media{{Data: []byte("fake-mp4"), MIME: "video/mp4"}, {URI: "https://www.youtube.com/watch?v=abc", MIME: "video/*"}}
	if _, _, err := client.GenerateJSONFromMedia(context.Background(), "sys", "describe it", media, testSchema()); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"video/mp4", "ZmFrZS1tcDQ=", "youtube.com/watch?v=abc", "describe it"} {
		if !strings.Contains(body, want) {
			t.Fatalf("request is missing %q: %s", want, body)
		}
	}
	if strings.Index(body, "ZmFrZS1tcDQ=") > strings.Index(body, "describe it") {
		t.Fatal("the media must come before the prompt text")
	}
}
