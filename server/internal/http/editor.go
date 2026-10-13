package httpserver

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/editor"
	"github.com/google/uuid"
)

// editorBody is larger than the default JSON limit: a timeline is a document.
const editorBody int64 = editor.MaxDocumentBytes + 4<<10

func (a *App) editorIdentity(w http.ResponseWriter, r *http.Request) (string, bool) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return "", false
	}
	return identity.UserID, true
}

func (a *App) editorID(w http.ResponseWriter, r *http.Request) (string, bool) {
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusNotFound, "not_found", "project not found")
		return "", false
	}
	return id, true
}

func (a *App) editorError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, editor.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, editor.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "project not found")
	case errors.Is(err, editor.ErrStale):
		writeError(w, http.StatusConflict, "stale_project", "this project was changed somewhere else; reload it")
	case errors.Is(err, editor.ErrLimit):
		writeError(w, http.StatusConflict, "project_limit", "you have reached the project limit")
	default:
		writeInternal(w, r, err)
	}
}

func (a *App) listEditorProjects(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	items, err := a.deps.Editor.List(r.Context(), userID, editor.MaxProjects)
	if err != nil {
		a.editorError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, items)
}

func (a *App) createEditorProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	var req struct {
		Title    string          `json:"title"`
		Document json.RawMessage `json:"document"`
	}
	if !decodeJSONLimit(w, r, &req, editorBody) {
		return
	}
	if req.Title == "" {
		req.Title = "Untitled project"
	}
	if len(req.Document) == 0 {
		req.Document = json.RawMessage(`{}`)
	}
	title, err := editor.ValidateTitle(req.Title)
	if err == nil {
		err = editor.ValidateDocument(req.Document)
	}
	if err != nil {
		a.editorError(w, r, err)
		return
	}
	project, err := a.deps.Editor.Create(r.Context(), userID, title, req.Document)
	if err != nil {
		a.editorError(w, r, err)
		return
	}
	writeData(w, http.StatusCreated, project)
}

func (a *App) getEditorProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	id, ok := a.editorID(w, r)
	if !ok {
		return
	}
	project, err := a.deps.Editor.Get(r.Context(), userID, id)
	if err != nil {
		a.editorError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, project)
}

func (a *App) saveEditorProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	id, ok := a.editorID(w, r)
	if !ok {
		return
	}
	var req struct {
		Title           string          `json:"title"`
		Document        json.RawMessage `json:"document"`
		ExpectedVersion int             `json:"expected_version"`
	}
	if !decodeJSONLimit(w, r, &req, editorBody) {
		return
	}
	title, err := editor.ValidateTitle(req.Title)
	if err == nil {
		err = editor.ValidateDocument(req.Document)
	}
	if err == nil && req.ExpectedVersion < 1 {
		err = editor.ErrInvalid
	}
	if err != nil {
		a.editorError(w, r, err)
		return
	}
	project, err := a.deps.Editor.Save(r.Context(), userID, id, title, req.Document, req.ExpectedVersion)
	if err != nil {
		a.editorError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, project)
}

func (a *App) deleteEditorProject(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	id, ok := a.editorID(w, r)
	if !ok {
		return
	}
	if err := a.deps.Editor.Delete(r.Context(), userID, id); err != nil {
		a.editorError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) conversationEditor(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusNotFound, "not_found", "conversation not found")
		return
	}
	project, err := a.deps.Editor.ForConversation(r.Context(), userID, id)
	if errors.Is(err, editor.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "conversation not found")
		return
	}
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, project)
}
