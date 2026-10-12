package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/google/uuid"
)

// MediaService is what the attachment endpoints need.
type MediaService interface {
	RequestUpload(ctx context.Context, userID, name, mime string, size int64) (media.Slot, error)
	Confirm(ctx context.Context, userID, id string) (media.Descriptor, error)
	ViewURL(ctx context.Context, userID, id string) (string, error)
}

func (a *App) requestMediaUpload(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		Name string `json:"name"`
		MIME string `json:"mime_type"`
		Size int64  `json:"size_bytes"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	slot, err := a.deps.Media.RequestUpload(r.Context(), identity.UserID, req.Name, req.MIME, req.Size)
	if err != nil {
		a.mediaError(w, r, err)
		return
	}
	writeData(w, http.StatusCreated, slot)
}

func (a *App) confirmMedia(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	id, valid := mediaID(w, r)
	if !ok || !valid {
		return
	}
	d, err := a.deps.Media.Confirm(r.Context(), identity.UserID, id)
	if err != nil {
		a.mediaError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, d)
}

func (a *App) mediaViewURL(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	id, valid := mediaID(w, r)
	if !ok || !valid {
		return
	}
	url, err := a.deps.Media.ViewURL(r.Context(), identity.UserID, id)
	if err != nil {
		a.mediaError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, map[string]string{"url": url})
}

func mediaID(w http.ResponseWriter, r *http.Request) (string, bool) {
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusNotFound, "not_found", "attachment not found")
		return "", false
	}
	return id, true
}

func (a *App) mediaError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, media.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "attachment not found")
	case errors.Is(err, media.ErrUnsupported):
		writeError(w, http.StatusUnsupportedMediaType, "unsupported_file", "that file type is not supported; use a JPEG, PNG or WebP picture, an MP4, MOV or WebM video, or MP3, M4A, WAV, WebM or OGG audio")
	case errors.Is(err, media.ErrTooLarge):
		writeError(w, http.StatusRequestEntityTooLarge, "file_too_large", err.Error())
	case errors.Is(err, media.ErrNotUploaded):
		writeError(w, http.StatusConflict, "not_uploaded", "the file has not finished uploading")
	case errors.Is(err, media.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", "that attachment is not valid")
	default:
		writeInternal(w, r, err)
	}
}
