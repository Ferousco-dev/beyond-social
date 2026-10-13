package httpserver

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/publish"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
	"github.com/google/uuid"
)

// PostService is what the post endpoints need.
type PostService interface {
	Schedule(ctx context.Context, userID string, r publish.Request, key string) (publish.Post, bool, error)
	List(ctx context.Context, userID string, limit, offset int) ([]publish.Post, error)
	Get(ctx context.Context, userID, id string) (publish.Post, error)
	Cancel(ctx context.Context, userID, id string) (publish.Post, error)
}

func (a *App) listPosts(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	limit, err := intParam(r, "limit", 50, 1, 200)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	offset, err := intParam(r, "offset", 0, 0, 10000)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	posts, err := a.deps.Posts.List(r.Context(), identity.UserID, limit, offset)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, posts)
}

func (a *App) createPost(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		Platform   string     `json:"platform"`
		Title      string     `json:"title"`
		Caption    string     `json:"caption"`
		Visibility string     `json:"visibility"`
		JobID      string     `json:"job_id"`
		At         *time.Time `json:"at"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.JobID != "" {
		if _, err := uuid.Parse(req.JobID); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_request", "job_id must be a UUID")
			return
		}
	}
	post, isNew, err := a.deps.Posts.Schedule(r.Context(), identity.UserID, publish.Request{
		Platform: social.Platform(req.Platform), Title: req.Title, Caption: req.Caption,
		Visibility: req.Visibility, JobID: req.JobID, At: req.At,
	}, r.Header.Get("Idempotency-Key"))
	if err != nil {
		a.postError(w, r, err)
		return
	}
	status := http.StatusAccepted
	if !isNew {
		status = http.StatusOK
	}
	writeData(w, status, post)
}

func (a *App) cancelPost(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusNotFound, "not_found", "post not found")
		return
	}
	post, err := a.deps.Posts.Cancel(r.Context(), identity.UserID, id)
	if err != nil {
		a.postError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, post)
}

func (a *App) postError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, publish.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, publish.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "post not found")
	case errors.Is(err, publish.ErrNotCancellable):
		writeError(w, http.StatusConflict, "not_cancellable", err.Error())
	case errors.Is(err, social.ErrNotConnected):
		writeError(w, http.StatusConflict, "not_connected", "connect that account first")
	case errors.Is(err, social.ErrReconnect):
		writeError(w, http.StatusConflict, "reconnect", "connect that account again; the saved sign-in no longer works")
	default:
		writeInternal(w, r, err)
	}
}
