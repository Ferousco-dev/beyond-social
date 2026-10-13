package httpserver

import (
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/library"
	"github.com/google/uuid"
)

func (a *App) listLibrary(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	limit, err := intParam(r, "limit", 24, 1, 100)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	offset, err := intParam(r, "offset", 0, 0, 10000)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	var items []library.Item
	if chat := r.URL.Query().Get("conversation"); chat != "" {
		if _, err := uuid.Parse(chat); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_request", "conversation must be a UUID")
			return
		}
		items, err = a.deps.Library.ListForConversation(r.Context(), identity.UserID, chat, limit)
	} else {
		items, err = a.deps.Library.List(r.Context(), identity.UserID, limit, offset)
	}
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, items)
}

func (a *App) deleteLibraryVideo(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "id must be a UUID")
		return
	}
	switch err := a.deps.Library.Hide(r.Context(), identity.UserID, id); {
	case errors.Is(err, library.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "video not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

// adoptLibraryVideo copies a finished video into the user's own storage and
// returns it as a media file the editor can use.
func (a *App) adoptLibraryVideo(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusNotFound, "not_found", "video not found")
		return
	}
	video, err := a.deps.Library.Video(r.Context(), identity.UserID, id)
	if errors.Is(err, library.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "video not found")
		return
	}
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	name := video.Prompt
	if name == "" {
		name = "Video"
	}
	d, err := a.deps.Media.AdoptVideo(r.Context(), identity.UserID, video.ID, video.VideoURL, name)
	if err != nil {
		a.mediaError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, d)
}
