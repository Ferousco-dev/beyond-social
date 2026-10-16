package httpserver

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/editor"
	"github.com/Ferousco-dev/beyond-social/server/internal/generate"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/llm"
	"github.com/Ferousco-dev/beyond-social/server/internal/openrouter"
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
func (f *fakeEditor) ChatContext(context.Context, string, string) (string, error) {
	return "user: a shoe ad", nil
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

func (f fakeAssistant) Assist(context.Context, []editor.Turn, string, string, string) (editor.Reply, error) {
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

type fakeWatcher struct{ err error }

func (f fakeWatcher) Watch(context.Context, string) (editor.ClipNotes, error) {
	return editor.ClipNotes{Summary: "A dog runs."}, f.err
}

type fakeScenes struct {
	last generate.Request
	err  error
}

func (f *fakeScenes) Submit(_ context.Context, _ string, r generate.Request, _ string) (jobs.Job, bool, error) {
	f.last = r
	return jobs.Job{ID: postID, Type: generate.JobType}, true, f.err
}
func (f *fakeScenes) Quote(_ context.Context, seconds int) (int, error) { return seconds * 4, nil }

func TestEditorWatchAndScenes(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	biller, scenes := &fakeBiller{}, &fakeScenes{}
	h.deps.Watcher, h.deps.WatchBiller, h.deps.Scenes = fakeWatcher{}, biller, scenes
	h.rebuild()
	a := h.token(t, alice)

	if res := send(h, http.MethodPost, "/api/v1/editor/watch", a, `{"url":"https://cdn.example/v.mp4"}`); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "A dog runs.") {
		t.Fatalf("watch: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/editor/watch", a, `{"url":"http://cdn.example/v.mp4"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("http url: %d", res.Code)
	}
	h.deps.Watcher = fakeWatcher{err: editor.ErrUnusable}
	h.rebuild()
	if res := send(h, http.MethodPost, "/api/v1/editor/watch", a, `{"url":"https://cdn.example/v.mp4"}`); res.Code != http.StatusUnprocessableEntity || biller.closed[len(biller.closed)-1] {
		t.Fatalf("unusable: %d %v", res.Code, biller.closed)
	}

	if res := send(h, http.MethodPost, "/api/v1/editor/scenes", a, `{"prompt":"a dog runs on","seconds":5}`); res.Code != http.StatusAccepted || scenes.last.TotalSeconds() != 5 {
		t.Fatalf("scene: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/editor/scenes", a, `{"prompt":"a dog runs on","seconds":5,"notify_email":true,"image_media_id":"40000000-0000-4000-8000-000000000001"}`); res.Code != http.StatusAccepted || !scenes.last.NotifyEmail || scenes.last.ImageMediaID != "40000000-0000-4000-8000-000000000001" {
		t.Fatalf("options must reach the request: %d %+v", res.Code, scenes.last)
	}
	scenes.err = generate.ErrInvalid
	if res := send(h, http.MethodPost, "/api/v1/editor/scenes", a, `{"prompt":"","seconds":5}`); res.Code != http.StatusBadRequest {
		t.Fatalf("invalid scene: %d", res.Code)
	}
	scenes.err = credits.ErrInsufficient
	if res := send(h, http.MethodPost, "/api/v1/editor/scenes", a, `{"prompt":"x","seconds":5}`); res.Code != http.StatusPaymentRequired {
		t.Fatalf("no credits: %d", res.Code)
	}
	if res := send(h, http.MethodGet, "/api/v1/editor/scenes/quote?seconds=5", a, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"credits":20`) {
		t.Fatalf("quote: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodGet, "/api/v1/editor/scenes/quote?seconds=99", a, ""); res.Code != http.StatusBadRequest {
		t.Fatalf("quote range: %d", res.Code)
	}
}

type fakeModels struct{ chosen string }

func (f *fakeModels) Current(context.Context) (map[string]string, error) {
	return map[string]string{"chat": "gemini", "editor_assistant": "openrouter:vendor/good"}, nil
}
func (f *fakeModels) Choose(_ context.Context, role, choice, _ string) error {
	if role == "nope" {
		return llm.ErrInvalid
	}
	f.chosen = role + "=" + choice
	return nil
}
func (f *fakeModels) Catalog(context.Context) ([]openrouter.Model, error) {
	return []openrouter.Model{{ID: "vendor/good", Name: "Good"}}, nil
}
func (f *fakeModels) OpenRouterConfigured(context.Context) bool { return true }

func TestAdminModels(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	fake := &fakeModels{}
	h.deps.Models = fake
	h.rebuild()
	h.profiles.rows[bob] = accounts.Profile{ID: bob, Role: accounts.RoleAdmin}
	admin, user := h.token(t, bob), h.token(t, alice)

	if res := send(h, http.MethodGet, "/api/v1/admin/models", user, ""); res.Code != http.StatusNotFound {
		t.Fatalf("a normal user reached it: %d", res.Code)
	}
	if res := send(h, http.MethodGet, "/api/v1/admin/models", admin, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "vendor/good") || !strings.Contains(res.Body.String(), "Editor assistant") {
		t.Fatalf("list: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPut, "/api/v1/admin/models/chat", admin, `{"model":"openrouter:vendor/good"}`); res.Code != http.StatusNoContent || fake.chosen != "chat=openrouter:vendor/good" {
		t.Fatalf("choose: %d %q", res.Code, fake.chosen)
	}
	if res := send(h, http.MethodPut, "/api/v1/admin/models/nope", admin, `{"model":"gemini"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("unknown role: %d", res.Code)
	}
}
