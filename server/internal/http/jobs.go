package httpserver

import (
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/transform"
	"github.com/google/uuid"
)

const (
	defaultPageSize = 25
	maxPageSize     = 100
)

type pagination struct {
	Limit   int  `json:"limit"`
	Offset  int  `json:"offset"`
	HasMore bool `json:"has_more"`
}

func (a *App) listJobs(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	limit, offset, ok := pageParams(w, r)
	if !ok {
		return
	}
	page, err := a.deps.Jobs.List(r.Context(), identity.UserID, limit, offset)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data":       page.Jobs,
		"pagination": pagination{Limit: limit, Offset: offset, HasMore: page.HasMore},
	})
}

func (a *App) getJob(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "job id must be a UUID")
		return
	}
	job, err := a.deps.Jobs.Get(r.Context(), identity.UserID, id)
	switch {
	case errors.Is(err, jobs.ErrNotFound):
		// Same answer whether the job is missing or belongs to someone else.
		writeError(w, http.StatusNotFound, "not_found", "job not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, job)
	}
}

type transformRequest struct {
	VideoID string `json:"video_id"`
	Prompt  string `json:"prompt"`
}

// createTransform queues a video-to-video job and returns it immediately.
func (a *App) createTransform(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req transformRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if _, err := uuid.Parse(req.VideoID); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "video_id must be a UUID")
		return
	}

	job, isNew, err := a.deps.Transform.Submit(r.Context(), identity.UserID, req.VideoID, req.Prompt, r.Header.Get("Idempotency-Key"))
	switch {
	case errors.Is(err, transform.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, transform.ErrVideoNotFound):
		writeError(w, http.StatusNotFound, "not_found", "video not found")
	case errors.Is(err, transform.ErrTooManyBusy):
		w.Header().Set("Retry-After", "30")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "you have too many videos in progress; wait for one to finish")
	case writeCreditError(w, err):
	case err != nil:
		writeInternal(w, r, err)
	case isNew:
		writeData(w, http.StatusAccepted, job)
	default:
		writeData(w, http.StatusOK, job)
	}
}
