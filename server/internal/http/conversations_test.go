package httpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/chat"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

const convID = "50000000-0000-4000-8000-000000000001"

type fakeChat struct{ err error }

func (f fakeChat) Create(context.Context, string) (chat.Conversation, error) {
	return chat.Conversation{ID: convID}, nil
}
func (f fakeChat) List(context.Context, string, int, int) ([]chat.Conversation, error) {
	return []chat.Conversation{{ID: convID}}, nil
}
func (f fakeChat) Thread(_ context.Context, user, id string) (chat.Conversation, []chat.Message, error) {
	if id != convID || user != alice {
		return chat.Conversation{}, nil, chat.ErrNotFound
	}
	return chat.Conversation{ID: id}, []chat.Message{{ID: "m1", Role: chat.RoleUser, Content: "hi"}}, nil
}
func (f fakeChat) Archive(context.Context, string, string) error { return nil }
func (f fakeChat) Rename(_ context.Context, user, id, title string) error {
	if f.err != nil {
		return f.err
	}
	if user != alice || id != convID {
		return chat.ErrNotFound
	}
	if strings.TrimSpace(title) == "" {
		return chat.ErrInvalidTitle
	}
	return nil
}
func (f fakeChat) Send(_ context.Context, _, _, content, _ string, _ []string, _ string) (chat.Exchange, error) {
	if f.err != nil {
		return chat.Exchange{}, f.err
	}
	return chat.Exchange{User: chat.Message{Content: content}, Assistant: chat.Message{Content: "reply"}}, nil
}

func TestConversationEndpoints(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.Chat = fakeChat{}
	h.rebuild()
	token := h.token(t, alice)
	base := "/api/v1/conversations"

	if res := send(h, http.MethodPost, base, token, ""); res.Code != http.StatusCreated {
		t.Fatalf("create: %d", res.Code)
	}
	if res := send(h, http.MethodGet, base+"/"+convID, token, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"hi"`) {
		t.Fatalf("get: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodGet, base+"/"+convID, h.token(t, bob), ""); res.Code != http.StatusNotFound {
		t.Fatalf("stranger: %d", res.Code)
	}
	if res := send(h, http.MethodGet, base+"/nope", token, ""); res.Code != http.StatusNotFound {
		t.Fatalf("malformed id: %d", res.Code)
	}
	if res := send(h, http.MethodGet, base, "", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
	if res := send(h, http.MethodPatch, base+"/"+convID, token, `{"title":"Product launch"}`); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"Product launch"`) {
		t.Fatalf("rename: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPatch, base+"/"+convID, token, `{"title":"   "}`); res.Code != http.StatusBadRequest {
		t.Fatalf("empty rename: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPatch, base+"/"+convID, h.token(t, bob), `{"title":"Not yours"}`); res.Code != http.StatusNotFound {
		t.Fatalf("rename stranger's conversation: %d", res.Code)
	}
	res := send(h, http.MethodPost, base+"/"+convID+"/messages", token, `{"content":"hello"}`)
	if res.Code != http.StatusCreated || !strings.Contains(res.Body.String(), `"reply"`) {
		t.Fatalf("send: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, base+"/"+convID+"/messages", token, `{"content":"x","model":"gpt"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("unknown field must be refused: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, base+"/"+convID, token, ""); res.Code != http.StatusNoContent {
		t.Fatalf("archive: %d", res.Code)
	}
}

func TestSendMessageErrorsAreMappedAndNeverLeakProviderDetail(t *testing.T) {
	for name, tc := range map[string]struct {
		err  error
		code int
	}{
		"invalid":  {chat.ErrInvalid, http.StatusBadRequest},
		"limit":    {chat.ErrDailyLimit, http.StatusTooManyRequests},
		"busy":     {chat.ErrBusy, http.StatusTooManyRequests},
		"provider": {&provider.Error{Provider: "gemini", Status: 402, Message: "secret detail"}, http.StatusBadGateway},
	} {
		t.Run(name, func(t *testing.T) {
			h := newHarness(t, &fakeRepo{}, fakePinger{})
			h.deps.Chat = fakeChat{err: tc.err}
			h.rebuild()
			res := send(h, http.MethodPost, "/api/v1/conversations/"+convID+"/messages", h.token(t, alice), `{"content":"hi"}`)
			if res.Code != tc.code || strings.Contains(res.Body.String(), "secret detail") {
				t.Fatalf("%d %s", res.Code, res.Body)
			}
		})
	}
}
