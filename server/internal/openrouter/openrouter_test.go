package openrouter

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"google.golang.org/genai"
)

func schema() *genai.Schema {
	max := int64(10)
	return &genai.Schema{
		Type: genai.TypeObject,
		Properties: map[string]*genai.Schema{
			"reply": {Type: genai.TypeString, MaxLength: &max},
			"ops":   {Type: genai.TypeArray, Items: &genai.Schema{Type: genai.TypeObject, Properties: map[string]*genai.Schema{"op": {Type: genai.TypeString, Enum: []string{"a", "b"}}}, Required: []string{"op"}}},
		},
		Required: []string{"reply", "ops"},
	}
}

func TestSchemaIsClosedAndLowercased(t *testing.T) {
	out := jsonSchema(schema())
	raw, _ := json.Marshal(out)
	for _, want := range []string{`"type":"object"`, `"additionalProperties":false`, `"enum":["a","b"]`, `"required":["reply","ops"]`} {
		if !strings.Contains(string(raw), want) {
			t.Errorf("schema lacks %s: %s", want, raw)
		}
	}
	if strings.Contains(string(raw), "maxLength") {
		t.Error("length limits should be left out")
	}
}

func TestGenerateJSONSendsAStrictRequestAndReadsTheAnswer(t *testing.T) {
	var got map[string]any
	var auth, title string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth, title = r.Header.Get("Authorization"), r.Header.Get("X-Title")
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &got)
		_, _ = w.Write([]byte("{\"choices\":[{\"message\":{\"content\":\"```json\\n{\\\"reply\\\":\\\"hi\\\",\\\"ops\\\":[]}\\n```\"}}],\"usage\":{\"prompt_tokens\":5,\"completion_tokens\":3,\"total_tokens\":8}}"))
	}))
	defer server.Close()
	c := NewClient(Config{KeyFunc: provider.StaticKey("sk-test"), BaseURL: server.URL})

	out, usage, err := c.GenerateJSON(context.Background(), "vendor/model", "be brief", "hello", schema())
	if err != nil || string(out) != `{"reply":"hi","ops":[]}` || usage.TotalTokens != 8 {
		t.Fatalf("out=%s usage=%+v err=%v", out, usage, err)
	}
	if auth != "Bearer sk-test" || title == "" || got["model"] != "vendor/model" {
		t.Fatalf("auth=%q title=%q body=%v", auth, title, got)
	}
	format := got["response_format"].(map[string]any)
	if format["type"] != "json_schema" || format["json_schema"].(map[string]any)["strict"] != true {
		t.Fatalf("response_format = %v", format)
	}
	if got["provider"].(map[string]any)["require_parameters"] != true {
		t.Fatalf("provider = %v", got["provider"])
	}
}

func TestErrorsAreClassifiedAndTransientOnesRetried(t *testing.T) {
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if calls == 1 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"{}"}}]}`))
	}))
	defer server.Close()
	c := NewClient(Config{KeyFunc: provider.StaticKey("k"), BaseURL: server.URL})
	if _, _, err := c.GenerateJSON(context.Background(), "m", "s", "u", schema()); err != nil || calls != 2 {
		t.Fatalf("a transient failure was not retried: calls=%d err=%v", calls, err)
	}

	refused := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusPaymentRequired)
		_, _ = w.Write([]byte(`{"error":{"message":"insufficient credits"}}`))
	}))
	defer refused.Close()
	c = NewClient(Config{KeyFunc: provider.StaticKey("k"), BaseURL: refused.URL})
	_, _, err := c.GenerateJSON(context.Background(), "m", "s", "u", schema())
	if err == nil || provider.IsTransient(err) || provider.Classify(err) == provider.ClassTransient {
		t.Fatalf("a refusal was treated as retryable: %v", err)
	}
}

func TestMissingKeyIsReportedAsNotConfigured(t *testing.T) {
	c := NewClient(Config{KeyFunc: func(context.Context) (string, error) { return "", provider.ErrNotConfigured("openrouter") }})
	_, _, err := c.GenerateJSON(context.Background(), "m", "s", "u", schema())
	if provider.Code(err) != provider.CodeNotConfigured || c.Configured(context.Background()) {
		t.Fatalf("err = %v", err)
	}
}

func TestModelsKeepOnlyStrictJSONModels(t *testing.T) {
	models.models, models.at = nil, models.at.Add(-2*catalogTTL)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"data":[
			{"id":"b/zed","name":"Zed","context_length":8000,"pricing":{"prompt":"0.000001","completion":"0.000002"},"supported_parameters":["structured_outputs","tools"]},
			{"id":"a/alpha","name":"Alpha","context_length":4000,"pricing":{"prompt":"0","completion":"0"},"supported_parameters":["structured_outputs"]},
			{"id":"c/plain","name":"Plain","supported_parameters":["tools"]}]}`))
	}))
	defer server.Close()
	list, err := NewClient(Config{BaseURL: server.URL}).Models(context.Background())
	if err != nil || len(list) != 2 || list[0].ID != "a/alpha" || list[1].InputPerM != 1 || list[1].OutputPerM != 2 {
		t.Fatalf("%+v %v", list, err)
	}
}
