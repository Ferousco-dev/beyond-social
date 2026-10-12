package httpserver

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/chat"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/google/uuid"
)

// turnTimeout bounds one chat turn, including the model call and any planning.
const turnTimeout = 75 * time.Second

// ChatService is the conversation API the handlers need.
type ChatService interface {
	Create(ctx context.Context, userID string) (chat.Conversation, error)
	List(ctx context.Context, userID string, limit, offset int) ([]chat.Conversation, error)
	Thread(ctx context.Context, userID, id string) (chat.Conversation, []chat.Message, error)
	Archive(ctx context.Context, userID, id string) error
	Send(ctx context.Context, userID, conversationID, content, key string, attachments []string) (chat.Exchange, error)
}

func (a *App) createConversation(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	c, err := a.deps.Chat.Create(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusCreated, c)
}

func (a *App) listConversations(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	limit, err := intParam(r, "limit", 30, 1, 100)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	offset, err := intParam(r, "offset", 0, 0, 10000)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	list, err := a.deps.Chat.List(r.Context(), identity.UserID, limit, offset)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, list)
}

func conversationID(w http.ResponseWriter, r *http.Request) (string, bool) {
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusNotFound, "not_found", "conversation not found")
		return "", false
	}
	return id, true
}

func (a *App) getConversation(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	id, valid := conversationID(w, r)
	if !ok || !valid {
		return
	}
	c, msgs, err := a.deps.Chat.Thread(r.Context(), identity.UserID, id)
	if errors.Is(err, chat.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "conversation not found")
		return
	}
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, map[string]any{"conversation": c, "messages": msgs})
}

func (a *App) archiveConversation(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	id, valid := conversationID(w, r)
	if !ok || !valid {
		return
	}
	err := a.deps.Chat.Archive(r.Context(), identity.UserID, id)
	switch {
	case errors.Is(err, chat.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "conversation not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

func (a *App) sendMessage(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	id, valid := conversationID(w, r)
	if !ok || !valid {
		return
	}
	var req struct {
		Content     string   `json:"content"`
		Attachments []string `json:"attachments"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	// A turn waits on a model, which can take far longer than the server-wide
	// write deadline allows. The deadline is lifted for this response only.
	if err := http.NewResponseController(w).SetWriteDeadline(time.Now().Add(turnTimeout + 5*time.Second)); err != nil {
		slog.Debug("extend write deadline", "error", err)
	}
	ctx, cancel := context.WithTimeout(r.Context(), turnTimeout)
	defer cancel()
	exchange, err := a.deps.Chat.Send(ctx, identity.UserID, id, req.Content, r.Header.Get("Idempotency-Key"), req.Attachments)
	if err != nil {
		a.chatError(w, r, err)
		return
	}
	writeData(w, http.StatusCreated, exchange)
}

func (a *App) chatError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, chat.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "conversation not found")
	case errors.Is(err, chat.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", "a message is 1 to 2000 characters of plain text")
	case errors.Is(err, chat.ErrDailyLimit):
		w.Header().Set("Retry-After", "3600")
		writeError(w, http.StatusTooManyRequests, "daily_limit", "you have reached the daily message limit; try again later")
	case errors.Is(err, chat.ErrBusy):
		w.Header().Set("Retry-After", "30")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "you have too many active workflows; wait for one to finish")
	case errors.Is(err, media.ErrNotFound), errors.Is(err, media.ErrUnsupported), errors.Is(err, media.ErrTooLarge),
		errors.Is(err, media.ErrNotUploaded), errors.Is(err, media.ErrInvalid):
		a.mediaError(w, r, err)
	case writeCreditError(w, err):
	default:
		var providerErr *provider.Error
		if errors.As(err, &providerErr) {
			writeError(w, http.StatusBadGateway, "provider_unavailable", provider.UserMessage)
			return
		}
		writeInternal(w, r, err)
	}
}
