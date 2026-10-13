package llm

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/openrouter"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"google.golang.org/genai"
)

type fakeGemini struct{ text, media int }

func (f *fakeGemini) GenerateJSON(context.Context, string, string, *genai.Schema) ([]byte, gemini.Usage, error) {
	f.text++
	return []byte(`{"from":"gemini"}`), gemini.Usage{}, nil
}
func (f *fakeGemini) GenerateJSONFromMedia(context.Context, string, string, []gemini.Media, *genai.Schema) ([]byte, gemini.Usage, error) {
	f.media++
	return []byte(`{"from":"gemini-media"}`), gemini.Usage{}, nil
}

type memSettings struct {
	mu sync.Mutex
	m  map[string]string
}

func (s *memSettings) Get(_ context.Context, key string) (string, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	v, ok := s.m[key]
	return v, ok, nil
}
func (s *memSettings) Set(_ context.Context, key, value, _ string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.m[key] = value
	return nil
}

func orServer(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/models") {
			_, _ = w.Write([]byte(`{"data":[{"id":"vendor/good","name":"Good","supported_parameters":["structured_outputs"]}]}`))
			return
		}
		_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"{\"from\":\"openrouter\"}"}}]}`))
	}))
}

func TestSwitchFollowsTheAdminsChoice(t *testing.T) {
	server := orServer(t)
	defer server.Close()
	g, settings := &fakeGemini{}, &memSettings{m: map[string]string{}}
	or := openrouter.NewClient(openrouter.Config{KeyFunc: provider.StaticKey("k"), BaseURL: server.URL})
	sw := NewSwitch(RoleChat, g, or, settings)
	admin := NewAdmin(settings, or, sw)
	ctx := context.Background()

	if out, _, _ := sw.GenerateJSON(ctx, "s", "u", nil); !strings.Contains(string(out), "gemini") {
		t.Fatalf("default: %s", out)
	}
	if err := admin.Choose(ctx, RoleChat, OpenRouterChoice("vendor/good"), "admin"); err != nil {
		t.Fatal(err)
	}
	if out, _, err := sw.GenerateJSON(ctx, "s", "u", nil); err != nil || !strings.Contains(string(out), "openrouter") {
		t.Fatalf("after choosing: %s %v", out, err)
	}
	// Anything that needs to watch or listen stays on Gemini.
	if out, _, _ := sw.GenerateJSONFromMedia(ctx, "s", "u", nil, nil); !strings.Contains(string(out), "gemini-media") {
		t.Fatalf("media: %s", out)
	}
	if err := admin.Choose(ctx, RoleChat, GeminiChoice, "admin"); err != nil {
		t.Fatal(err)
	}
	if out, _, _ := sw.GenerateJSON(ctx, "s", "u", nil); !strings.Contains(string(out), `"gemini"`) {
		t.Fatalf("back to default: %s", out)
	}
}

func TestSwitchFallsBackToGeminiWhenTheKeyIsNotInYet(t *testing.T) {
	g, settings := &fakeGemini{}, &memSettings{m: map[string]string{SettingKey(RoleChat): OpenRouterChoice("vendor/good")}}
	or := openrouter.NewClient(openrouter.Config{KeyFunc: func(context.Context) (string, error) { return "", provider.ErrNotConfigured("openrouter") }})
	out, _, err := NewSwitch(RoleChat, g, or, settings).GenerateJSON(context.Background(), "s", "u", nil)
	if err != nil || !strings.Contains(string(out), "gemini") || g.text != 1 {
		t.Fatalf("out=%s err=%v", out, err)
	}
}

func TestAdminRefusesUnknownRolesAndModels(t *testing.T) {
	server := orServer(t)
	defer server.Close()
	settings := &memSettings{m: map[string]string{}}
	admin := NewAdmin(settings, openrouter.NewClient(openrouter.Config{BaseURL: server.URL}))
	ctx := context.Background()
	for name, tc := range map[string][2]string{
		"unknown role":  {"nope", GeminiChoice},
		"unknown model": {RoleChat, OpenRouterChoice("vendor/missing")},
		"bare model":    {RoleChat, "vendor/good"},
	} {
		if err := admin.Choose(ctx, tc[0], tc[1], "a"); err == nil {
			t.Errorf("%s accepted", name)
		}
	}
	if len(settings.m) != 0 {
		t.Fatalf("a refused choice was stored: %v", settings.m)
	}
	current, _ := admin.Current(ctx)
	if current[RoleChat] != GeminiChoice || current[RoleEditorAssistant] != GeminiChoice {
		t.Fatalf("defaults: %v", current)
	}
}
