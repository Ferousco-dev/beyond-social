package httpserver

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kietools"
	"github.com/google/uuid"
)

// VoiceoverSubmitter queues a speech job. kietools.Service is the production one.
type VoiceoverSubmitter interface {
	Submit(ctx context.Context, userID, jobType string, args map[string]any, key string) (jobs.Job, bool, error)
}

// createVoiceover reads a script aloud in one voice, as a single recording. One
// request for the whole video is what keeps the voice from changing.
func (a *App) createVoiceover(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		Text  string `json:"text"`
		Voice string `json:"voice"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	args := map[string]any{"text": strings.TrimSpace(req.Text)}
	if v := strings.TrimSpace(req.Voice); v != "" {
		if !kietools.KnownVoice(v) {
			writeError(w, http.StatusBadRequest, "invalid_request", "that voice is not available")
			return
		}
		args["voice"] = v
	}
	if _, err := kietools.ParseSpeech(args); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", strings.TrimPrefix(err.Error(), kietools.ErrInvalid.Error()+": "))
		return
	}
	job, isNew, err := a.deps.Voiceover.Submit(r.Context(), identity.UserID, kietools.JobSpeech, args, r.Header.Get("Idempotency-Key"))
	switch {
	case err == nil && isNew:
		writeData(w, http.StatusAccepted, job)
	case err == nil:
		writeData(w, http.StatusOK, job)
	case errors.Is(err, kietools.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", "that voiceover is not valid")
	case errors.Is(err, kietools.ErrTooManyBusy):
		w.Header().Set("Retry-After", "30")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "you have too many voiceovers in progress; wait for one to finish")
	case writeCreditError(w, err):
	default:
		writeInternal(w, r, err)
	}
}

// adoptVoiceover copies a finished voiceover into the user's own storage and
// returns it as a media file the editor can play.
func (a *App) adoptVoiceover(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusNotFound, "not_found", "voiceover not found")
		return
	}
	job, err := a.deps.Jobs.Get(r.Context(), identity.UserID, id)
	if errors.Is(err, jobs.ErrNotFound) || (err == nil && job.Type != kietools.JobSpeech) {
		writeError(w, http.StatusNotFound, "not_found", "voiceover not found")
		return
	}
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if job.Status != jobs.StatusCompleted {
		writeError(w, http.StatusConflict, "not_ready", "the voiceover is not finished yet")
		return
	}
	source, _ := job.Result[kietools.ResultKeys[kietools.JobSpeech]].(string)
	if source == "" {
		writeError(w, http.StatusConflict, "not_ready", "the voiceover has no recording")
		return
	}
	d, err := a.deps.Media.AdoptAudio(r.Context(), identity.UserID, job.ID, source, "Voiceover")
	if err != nil {
		a.mediaError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, d)
}
