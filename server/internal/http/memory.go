package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/memory"
)

// MemoryService is what the memory endpoints need.
type MemoryService interface {
	Settings(ctx context.Context, userID string) (memory.Settings, error)
	Add(ctx context.Context, userID, content string) (memory.Fact, error)
	Delete(ctx context.Context, userID, id string) error
	SetEnabled(ctx context.Context, userID string, enabled bool) error
	Block(ctx context.Context, userID string) string
}

func (a *App) memorySettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	settings, err := a.deps.Memory.Settings(r.Context(), userID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, settings)
}

func (a *App) addMemory(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	var req struct {
		Content string `json:"content"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	fact, err := a.deps.Memory.Add(r.Context(), userID, req.Content)
	switch {
	case errors.Is(err, memory.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, memory.ErrFull):
		writeError(w, http.StatusConflict, "memory_full", err.Error())
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusCreated, fact)
	}
}

func (a *App) deleteMemory(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	err := a.deps.Memory.Delete(r.Context(), userID, r.PathValue("id"))
	switch {
	case errors.Is(err, memory.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "memory not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

func (a *App) setMemoryEnabled(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := a.deps.Memory.SetEnabled(r.Context(), userID, req.Enabled); err != nil {
		writeInternal(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
