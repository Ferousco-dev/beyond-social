package httpserver

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/editor"
)

type fakeEditor struct{ saveErr error }

func (f *fakeEditor) Create(_ context.Context, _, title string, doc json.RawMessage) (editor.Project, error) {
	return editor.Project{ID: postID, Title: title, Document: doc, Version: 1}, nil
}
func (f *fakeEditor) Get(_ context.Context, user, id string) (editor.Project, error) {
	if user != alice {
		return editor.Project{}, editor.ErrNotFound
	}
	return editor.Project{ID: id, Title: "Ad", Document: json.RawMessage(`{}`), Version: 1}, nil
}
func (f *fakeEditor) ForConversation(_ context.Context, user, id string) (editor.Project, error) {
	if user != alice {
		return editor.Project{}, editor.ErrNotFound
	}
	return editor.Project{ID: postID, ConversationID: id, Title: "Chat", Document: json.RawMessage(`{}`), Version: 1}, nil
}
func (f *fakeEditor) List(context.Context, string, int) ([]editor.Summary, error) {
	return []editor.Summary{{ID: postID, Title: "Ad"}}, nil
}
func (f *fakeEditor) Save(_ context.Context, _, id, title string, doc json.RawMessage, _ int) (editor.Project, error) {
	return editor.Project{ID: id, Title: title, Document: doc, Version: 2}, f.saveErr
}
func (f *fakeEditor) Delete(context.Context, string, string) error { return nil }

func TestEditorEndpoints(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	fake := &fakeEditor{}
	h.deps.Editor = fake
	h.rebuild()
	a, b := h.token(t, alice), h.token(t, bob)
	path := "/api/v1/editor/projects/" + postID

	if res := send(h, http.MethodGet, "/api/v1/editor/projects", "", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/editor/projects", a, `{"title":"Ad"}`); res.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/editor/projects", a, `{"document":[]}`); res.Code != http.StatusBadRequest {
		t.Fatalf("array document: %d", res.Code)
	}
	if res := send(h, http.MethodGet, path, b, ""); res.Code != http.StatusNotFound {
		t.Fatalf("stranger: %d", res.Code)
	}
	big := `{"title":"Ad","expected_version":1,"document":{"x":"` + strings.Repeat("a", 100<<10) + `"}}`
	if res := send(h, http.MethodPut, path, a, big); res.Code != http.StatusOK {
		t.Fatalf("a 100 KB project was refused: %d", res.Code)
	}
	if res := send(h, http.MethodPut, path, a, `{"title":"Ad","document":{}}`); res.Code != http.StatusBadRequest {
		t.Fatalf("missing version: %d", res.Code)
	}
	fake.saveErr = editor.ErrStale
	if res := send(h, http.MethodPut, path, a, `{"title":"Ad","expected_version":1,"document":{}}`); res.Code != http.StatusConflict {
		t.Fatalf("stale: %d", res.Code)
	}
	chat := "/api/v1/conversations/" + postID + "/editor"
	if res := send(h, http.MethodPut, chat, a, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "conversation_id") {
		t.Fatalf("open from chat: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPut, chat, b, ""); res.Code != http.StatusNotFound {
		t.Fatalf("someone else's chat: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/editor/projects/nope", a, ""); res.Code != http.StatusNotFound {
		t.Fatalf("bad id: %d", res.Code)
	}
}

type fakeAssistant struct{ err error }

func (f fakeAssistant) Assist(context.Context, []editor.Turn, string, string) (editor.Reply, error) {
	return editor.Reply{Reply: "Cut it."}, f.err
}

type fakeBiller struct {
	reserveErr error
	closed     []bool
}

func (f *fakeBiller) Reserve(context.Context, string, string) error { return f.reserveErr }
func (f *fakeBiller) Close(_ context.Context, _, _ string, delivered bool) error {
	f.closed = append(f.closed, delivered)
	return nil
}

func TestEditorAssistChargesAndRefunds(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	biller := &fakeBiller{}
	h.deps.Assistant, h.deps.AssistBiller = fakeAssistant{}, biller
	h.rebuild()
	a := h.token(t, alice)
	body := `{"message":"cut at 3","history":[],"state":"{}"}`

	if res := send(h, http.MethodPost, "/api/v1/editor/assist", a, body); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"operations":[]`) {
		t.Fatalf("ok: %d %s", res.Code, res.Body)
	}
	if len(biller.closed) != 1 || !biller.closed[0] {
		t.Fatalf("a delivered answer was not kept: %v", biller.closed)
	}
	h.deps.Assistant = fakeAssistant{err: context.DeadlineExceeded}
	h.rebuild()
	if res := send(h, http.MethodPost, "/api/v1/editor/assist", a, body); res.Code != http.StatusBadGateway {
		t.Fatalf("failure: %d", res.Code)
	}
	if len(biller.closed) != 2 || biller.closed[1] {
		t.Fatalf("a failed answer was charged: %v", biller.closed)
	}
	for name, bad := range map[string]string{
		"empty":    `{"message":"  "}`,
		"bad role": `{"message":"x","history":[{"role":"system","content":"y"}]}`,
	} {
		if res := send(h, http.MethodPost, "/api/v1/editor/assist", a, bad); res.Code != http.StatusBadRequest {
			t.Errorf("%s: %d", name, res.Code)
		}
	}
	biller.reserveErr = credits.ErrInsufficient
	if res := send(h, http.MethodPost, "/api/v1/editor/assist", a, body); res.Code != http.StatusPaymentRequired {
		t.Fatalf("no credits: %d", res.Code)
	}
}

type fakeTranscriber struct{ err error }

func (f fakeTranscriber) Transcribe(context.Context, string) ([]editor.Word, error) {
	return []editor.Word{{Text: "Hi", Start: 0, End: 0.4}}, f.err
}

func TestEditorTranscribe(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	biller := &fakeBiller{}
	h.deps.Transcriber, h.deps.CaptionBiller = fakeTranscriber{}, biller
	h.rebuild()
	a := h.token(t, alice)
	body := `{"url":"https://cdn.example/v.mp4"}`

	if res := send(h, http.MethodPost, "/api/v1/editor/transcribe", a, body); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"Hi"`) {
		t.Fatalf("ok: %d %s", res.Code, res.Body)
	}
	for name, bad := range map[string]string{
		"http":      `{"url":"http://cdn.example/v.mp4"}`,
		"userinfo":  `{"url":"https://a:b@cdn.example/v.mp4"}`,
		"not a url": `{"url":"nope"}`,
	} {
		if res := send(h, http.MethodPost, "/api/v1/editor/transcribe", a, bad); res.Code != http.StatusBadRequest {
			t.Errorf("%s: %d", name, res.Code)
		}
	}
	for err, want := range map[error]int{editor.ErrUnusable: http.StatusUnprocessableEntity, editor.ErrTooLarge: http.StatusRequestEntityTooLarge} {
		h.deps.Transcriber = fakeTranscriber{err: err}
		h.rebuild()
		before := len(biller.closed)
		if res := send(h, http.MethodPost, "/api/v1/editor/transcribe", a, body); res.Code != want {
			t.Errorf("%v: %d", err, res.Code)
		}
		if biller.closed[len(biller.closed)-1] || len(biller.closed) != before+1 {
			t.Errorf("%v was charged", err)
		}
	}
}
