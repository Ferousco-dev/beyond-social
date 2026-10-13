package httpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/editor"
	"github.com/Ferousco-dev/beyond-social/server/internal/memory"
)

type fakeMemory struct {
	facts   []memory.Fact
	enabled bool
}

func (f *fakeMemory) Settings(context.Context, string) (memory.Settings, error) {
	return memory.Settings{Enabled: f.enabled, Facts: f.facts, Limit: memory.MaxFacts}, nil
}
func (f *fakeMemory) Add(_ context.Context, _, content string) (memory.Fact, error) {
	content, ok := memory.Clean(content)
	if !ok {
		return memory.Fact{}, memory.ErrInvalid
	}
	if len(f.facts) >= 1 {
		return memory.Fact{}, memory.ErrFull
	}
	fact := memory.Fact{ID: "f1", Content: content}
	f.facts = append(f.facts, fact)
	return fact, nil
}
func (f *fakeMemory) Delete(_ context.Context, _, id string) error {
	if id != "f1" || len(f.facts) == 0 {
		return memory.ErrNotFound
	}
	f.facts = nil
	return nil
}
func (f *fakeMemory) SetEnabled(_ context.Context, _ string, e bool) error { f.enabled = e; return nil }
func (f *fakeMemory) Block(context.Context, string) string {
	if !f.enabled || len(f.facts) == 0 {
		return ""
	}
	return "- " + f.facts[0].Content
}

func TestMemoryEndpoints(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	mem := &fakeMemory{enabled: true}
	h.deps.Memory = mem
	h.rebuild()
	a := h.token(t, alice)

	if res := send(h, http.MethodGet, "/api/v1/memory", "", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/memory", a, `{"content":"I make food videos"}`); res.Code != http.StatusCreated {
		t.Fatalf("add: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/memory", a, `{"content":"another"}`); res.Code != http.StatusConflict {
		t.Fatalf("full: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/memory", a, `{"content":"  "}`); res.Code != http.StatusBadRequest {
		t.Fatalf("blank: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/memory", a, `{"content":"x","extra":1}`); res.Code != http.StatusBadRequest {
		t.Fatalf("unknown field: %d", res.Code)
	}
	if res := send(h, http.MethodGet, "/api/v1/memory", a, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "I make food videos") {
		t.Fatalf("list: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPut, "/api/v1/memory/enabled", a, `{"enabled":false}`); res.Code != http.StatusNoContent || mem.enabled {
		t.Fatalf("switch off: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/memory/nope", a, ""); res.Code != http.StatusNotFound {
		t.Fatalf("missing: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/memory/f1", a, ""); res.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", res.Code)
	}
}

type captureAssistant struct{ about string }

func (c *captureAssistant) Assist(_ context.Context, _ []editor.Turn, _, _, about string) (editor.Reply, error) {
	c.about = about
	return editor.Reply{Reply: "ok"}, nil
}

func TestTheEditorAssistantIsGivenSavedFactsOnlyWhileMemoryIsOn(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	assistant := &captureAssistant{}
	mem := &fakeMemory{enabled: true, facts: []memory.Fact{{ID: "f1", Content: "Audience is founders"}}}
	h.deps.Assistant, h.deps.AssistBiller, h.deps.Memory = assistant, &fakeBiller{}, mem
	h.rebuild()
	a := h.token(t, alice)
	body := `{"message":"cut at 3","history":[],"state":"{}"}`

	if res := send(h, http.MethodPost, "/api/v1/editor/assist", a, body); res.Code != http.StatusOK || !strings.Contains(assistant.about, "Audience is founders") {
		t.Fatalf("on: %d about=%q", res.Code, assistant.about)
	}
	mem.enabled = false
	if res := send(h, http.MethodPost, "/api/v1/editor/assist", a, body); res.Code != http.StatusOK || assistant.about != "" {
		t.Fatalf("off: %d about=%q", res.Code, assistant.about)
	}
}
