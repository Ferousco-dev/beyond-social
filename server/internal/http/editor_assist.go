package httpserver

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/editor"
	"github.com/google/uuid"
)

// ResourceBiller charges for one request: reserve first, then keep or refund.
type ResourceBiller interface {
	Reserve(ctx context.Context, userID, resourceID string) error
	Close(ctx context.Context, userID, resourceID string, delivered bool) error
}

func (a *App) editorAssist(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	var req struct {
		Message string        `json:"message"`
		History []editor.Turn `json:"history"`
		State   string        `json:"state"`
		// ProjectID lets the assistant read the chat the video came from.
		ProjectID string `json:"project_id"`
	}
	if !decodeJSONLimit(w, r, &req, editor.MaxStateBytes+16<<10) {
		return
	}
	req.Message = strings.TrimSpace(req.Message)
	switch {
	case req.Message == "" || utf8.RuneCountInString(req.Message) > editor.MaxMessageRunes:
		writeError(w, http.StatusBadRequest, "invalid_request", "the message must be 1 to 1000 characters")
		return
	case len(req.State) > editor.MaxStateBytes:
		writeError(w, http.StatusBadRequest, "invalid_request", "the project is too large to describe")
		return
	}
	if len(req.History) > editor.MaxHistory {
		req.History = req.History[len(req.History)-editor.MaxHistory:]
	}
	for i := range req.History {
		if req.History[i].Role != "user" && req.History[i].Role != "assistant" {
			writeError(w, http.StatusBadRequest, "invalid_request", "history roles must be user or assistant")
			return
		}
		if utf8.RuneCountInString(req.History[i].Content) > editor.MaxMessageRunes {
			req.History[i].Content = string([]rune(req.History[i].Content)[:editor.MaxMessageRunes])
		}
	}

	// What the video is about comes from its chat. Losing it only makes the answer less informed.
	about := ""
	if _, err := uuid.Parse(req.ProjectID); err == nil {
		if text, err := a.deps.Editor.ChatContext(r.Context(), userID, req.ProjectID); err != nil {
			slog.Warn("editor chat context", "error", err)
		} else {
			about = text
		}
	}
	var reply editor.Reply
	if !a.charged(w, r, userID, a.deps.AssistBiller, func() error {
		var err error
		reply, err = a.deps.Assistant.Assist(r.Context(), req.History, req.Message, req.State, about)
		return err
	}, "the assistant could not answer") {
		return
	}
	if reply.Operations == nil {
		reply.Operations = []editor.Operation{}
	}
	writeData(w, http.StatusOK, reply)
}

// charged runs work the user pays for. The credits are reserved first, kept
// when the work succeeds and returned when it does not. It answers the request
// itself on failure and reports whether the work succeeded.
func (a *App) charged(w http.ResponseWriter, r *http.Request, userID string, biller ResourceBiller, work func() error, failure string) bool {
	charge := uuid.NewString()
	if err := biller.Reserve(r.Context(), userID, charge); err != nil {
		if !writeCreditError(w, err) {
			writeInternal(w, r, err)
		}
		return false
	}
	err := work()
	// Closed on a fresh context: a client that hung up must still get its credit back.
	if closeErr := biller.Close(context.WithoutCancel(r.Context()), userID, charge, err == nil); closeErr != nil {
		slog.Error("close editor charge", "charge", charge, "error", closeErr)
	}
	if err == nil {
		return true
	}
	switch {
	case errors.Is(err, editor.ErrUnusable):
		writeError(w, http.StatusUnprocessableEntity, "unusable_media", "that video could not be opened; you were not charged")
	case errors.Is(err, editor.ErrTooLarge):
		writeError(w, http.StatusRequestEntityTooLarge, "media_too_large", "that video is too large; you were not charged")
	default:
		slog.Error("editor work", "error", err)
		writeError(w, http.StatusBadGateway, "provider_failed", failure+"; you were not charged")
	}
	return false
}

func (a *App) editorTranscribe(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	var req struct {
		URL string `json:"url"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if u, err := url.Parse(req.URL); err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "url must be an https address")
		return
	}
	var words []editor.Word
	if !a.charged(w, r, userID, a.deps.CaptionBiller, func() error {
		var err error
		words, err = a.deps.Transcriber.Transcribe(r.Context(), req.URL)
		return err
	}, "the captions could not be made") {
		return
	}
	if words == nil {
		words = []editor.Word{}
	}
	writeData(w, http.StatusOK, map[string]any{"words": words})
}

func (a *App) editorWatch(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	var req struct {
		URL string `json:"url"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if u, err := url.Parse(req.URL); err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "url must be an https address")
		return
	}
	var notes editor.ClipNotes
	if !a.charged(w, r, userID, a.deps.WatchBiller, func() error {
		var err error
		notes, err = a.deps.Watcher.Watch(r.Context(), req.URL)
		return err
	}, "the video could not be watched") {
		return
	}
	if notes.Scenes == nil {
		notes.Scenes = []editor.ClipScene{}
	}
	writeData(w, http.StatusOK, notes)
}
