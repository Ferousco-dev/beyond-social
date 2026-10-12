package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/avatarvideo"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/google/uuid"
)

// VideoReader fetches one avatar video with a fresh file URL.
type VideoReader interface {
	Get(ctx context.Context, userID, jobID string) (jobs.Job, error)
}

type avatarVideoRequest struct {
	AvatarID string `json:"avatar_id"`
	VoiceID  string `json:"voice_id"`
	Script   string `json:"script"`
}

// createAvatarVideo queues a script-to-video job and returns it immediately.
func (a *App) createAvatarVideo(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req avatarVideoRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if _, err := uuid.Parse(req.AvatarID); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "avatar_id must be a UUID")
		return
	}
	if len(req.VoiceID) > 200 {
		writeError(w, http.StatusBadRequest, "invalid_request", "invalid voice_id")
		return
	}
	job, isNew, err := a.deps.AvatarVideo.Submit(r.Context(), identity.UserID, avatarvideo.SubmitInput{
		AvatarID: req.AvatarID, VoiceID: req.VoiceID, Script: req.Script, IdempotencyKey: r.Header.Get("Idempotency-Key"),
	})
	switch {
	case err == nil && isNew:
		writeData(w, http.StatusAccepted, job)
	case err == nil:
		writeData(w, http.StatusOK, job)
	case errors.Is(err, avatarvideo.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, avatarvideo.ErrAvatarNotFound):
		writeError(w, http.StatusNotFound, "not_found", "avatar not found")
	case errors.Is(err, avatarvideo.ErrAvatarNotReady):
		writeError(w, http.StatusConflict, "avatar_not_ready", "the avatar is not ready yet")
	case errors.Is(err, avatarvideo.ErrNoVoice):
		writeError(w, http.StatusConflict, "no_voice", "choose a voice for this avatar first")
	case errors.Is(err, avatarvideo.ErrVoiceNotAllowed):
		writeError(w, http.StatusForbidden, "voice_not_allowed", "that voice is not available to you")
	case errors.Is(err, avatarvideo.ErrTooManyBusy):
		w.Header().Set("Retry-After", "30")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "you have too many videos in progress; wait for one to finish")
	default:
		writeInternal(w, r, err)
	}
}

func (a *App) getAvatarVideo(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "video id must be a UUID")
		return
	}
	job, err := a.deps.Videos.Get(r.Context(), identity.UserID, id)
	switch {
	case errors.Is(err, jobs.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "video not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, job)
	}
}
