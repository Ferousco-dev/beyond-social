package httpserver

import (
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/kietools"
)

type liveAvatarRequest struct {
	GroupID string `json:"group_id"`
	VoiceID string `json:"voice_id"`
	Script  string `json:"script"`
	Prompt  string `json:"prompt"`
}

func (a *App) createLiveAvatarVideo(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req liveAvatarRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	job, isNew, err := a.deps.LiveAvatar.Submit(r.Context(), identity.UserID, kietools.LiveAvatarInput{
		GroupID: req.GroupID, VoiceID: req.VoiceID, Script: req.Script, Prompt: req.Prompt, IdempotencyKey: r.Header.Get("Idempotency-Key"),
	})
	switch {
	case err == nil && isNew:
		writeData(w, http.StatusAccepted, job)
	case err == nil:
		writeData(w, http.StatusOK, job)
	case errors.Is(err, kietools.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", "Use a consented face image, cloned voice, script and scene direction.")
	case errors.Is(err, kietools.ErrTooManyBusy):
		w.Header().Set("Retry-After", "30")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "you have too many videos in progress; wait for one to finish")
	case writeCreditError(w, err):
	default:
		writeInternal(w, r, err)
	}
}
