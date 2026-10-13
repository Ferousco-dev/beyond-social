package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/generate"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// SceneService makes one new AI video clip for the editor and says what it costs.
type SceneService interface {
	Submit(ctx context.Context, userID string, r generate.Request, key string) (jobs.Job, bool, error)
	Quote(ctx context.Context, seconds int) (int, error)
}

func (a *App) createScene(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		Prompt      string `json:"prompt"`
		Seconds     int    `json:"seconds"`
		AspectRatio string `json:"aspect_ratio"`
		Sound       bool   `json:"sound"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	job, isNew, err := a.deps.Scenes.Submit(r.Context(), identity.UserID, generate.Request{
		Scenes:      []generate.Scene{{Prompt: req.Prompt, Seconds: req.Seconds}},
		AspectRatio: req.AspectRatio,
		Sound:       req.Sound,
	}, r.Header.Get("Idempotency-Key"))
	switch {
	case errors.Is(err, generate.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, generate.ErrTooManyBusy):
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

func (a *App) sceneQuote(w http.ResponseWriter, r *http.Request) {
	if _, ok := auth.IdentityFromContext(r.Context()); !ok {
		writeUnauthorized(w)
		return
	}
	seconds, err := intParam(r, "seconds", generate.MinClipSeconds, generate.MinClipSeconds, generate.MaxClipSeconds)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	credits, err := a.deps.Scenes.Quote(r.Context(), seconds)
	if err != nil {
		if !writeCreditError(w, err) {
			writeInternal(w, r, err)
		}
		return
	}
	writeData(w, http.StatusOK, map[string]int{"credits": credits, "seconds": seconds})
}
