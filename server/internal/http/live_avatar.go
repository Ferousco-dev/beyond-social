package httpserver

import (
	"errors"
	"net/http"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/kietools"
)

type liveAvatarScriptRequest struct {
	Objective string `json:"objective"`
	Audience  string `json:"audience"`
	Product   string `json:"product"`
	Style     string `json:"style"`
}

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

func (a *App) draftLiveAvatarScript(w http.ResponseWriter, r *http.Request) {
	if _, ok := auth.IdentityFromContext(r.Context()); !ok {
		writeUnauthorized(w)
		return
	}
	var req liveAvatarScriptRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	message := strings.TrimSpace(strings.Join([]string{
		"Create a concise talking-head social video script.",
		"Objective: " + strings.TrimSpace(req.Objective),
		"Audience: " + strings.TrimSpace(req.Audience),
		"Product or service: " + strings.TrimSpace(req.Product),
		"Style: " + strings.TrimSpace(req.Style),
	}, "\n"))
	if strings.TrimSpace(req.Objective) == "" || strings.TrimSpace(req.Audience) == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "objective and audience are required")
		return
	}
	script, err := a.deps.LiveAvatarScripts.Write(r.Context(), nil, message, nil)
	if err != nil {
		writeError(w, http.StatusBadGateway, "provider_unavailable", "script generation is unavailable right now")
		return
	}
	lines := make([]string, 0, len(script.Scenes))
	for _, scene := range script.Scenes {
		if scene.Voiceover != "" {
			lines = append(lines, scene.Voiceover)
		}
	}
	if len(lines) == 0 {
		writeError(w, http.StatusBadGateway, "provider_unavailable", "the script did not include narration; try again")
		return
	}
	writeData(w, http.StatusOK, map[string]string{"script": strings.Join(lines, "\n\n")})
}
