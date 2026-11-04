package httpserver

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/kietools"
)

type liveAvatarScriptRequest struct {
	Objective string `json:"objective"`
	Audience  string `json:"audience"`
	Product   string `json:"product"`
	Style     string `json:"style"`
}

type liveAvatarRequest struct {
	FaceAssetID  string `json:"face_asset_id"`
	VoiceAssetID string `json:"voice_asset_id"`
	GroupID      string `json:"group_id"`
	Script       string `json:"script"`
	Prompt       string `json:"prompt"`
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
		FaceAssetID: req.FaceAssetID, VoiceAssetID: req.VoiceAssetID, GroupID: req.GroupID, Script: req.Script, Prompt: req.Prompt, IdempotencyKey: r.Header.Get("Idempotency-Key"),
	})
	switch {
	case err == nil && isNew:
		writeData(w, http.StatusAccepted, job)
	case err == nil:
		writeData(w, http.StatusOK, job)
	case errors.Is(err, kietools.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", liveAvatarRefusal(err))
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

// liveAvatarRefusal names what is wrong with a picked asset when the library
// said so (for example a face without consent), or gives the general rule.
func liveAvatarRefusal(err error) string {
	if errors.Is(err, assetlib.ErrInvalid) || errors.Is(err, assetlib.ErrNotFound) {
		message := err.Error()
		if i := strings.LastIndex(message, ": "); i >= 0 {
			message = message[i+2:]
		}
		return "The face or voice cannot be used: " + message + "."
	}
	return "Use a consented face image, consented voice recording, script and scene direction."
}

// quoteLiveAvatar prices lip-synced videos before they are made: each voice
// recording's length, in whole seconds, at the talking-video rate.
func (a *App) quoteLiveAvatar(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	voices, groupID := r.URL.Query()["voice"], r.URL.Query().Get("group")
	if groupID != "" {
		if len(voices) != 0 {
			writeError(w, http.StatusBadRequest, "invalid_request", "price either a saved group or its voice recordings, not both")
			return
		}
	} else if len(voices) == 0 || len(voices) > kietools.MaxTurns {
		writeError(w, http.StatusBadRequest, "invalid_request", "give one voice recording for each speaker, up to six")
		return
	}
	seconds, err := a.liveAvatarSeconds(r.Context(), identity.UserID, groupID, voices)
	if err != nil {
		if errors.Is(err, kietools.ErrInvalid) {
			writeError(w, http.StatusBadRequest, "invalid_request", liveAvatarRefusal(err))
			return
		}
		writeInternal(w, r, err)
		return
	}
	rate, err := a.deps.Prices.Quote(r.Context(), credits.ActionTalkingSecond)
	if err != nil {
		if !writeCreditError(w, err) {
			writeInternal(w, r, err)
		}
		return
	}
	writeData(w, http.StatusOK, map[string]int{"credits": rate * seconds, "seconds": seconds})
}

// liveAvatarSeconds measures what a quote is for: one saved group's recording,
// or the voice recordings picked for a talking video or a conversation.
func (a *App) liveAvatarSeconds(ctx context.Context, userID, groupID string, voices []string) (int, error) {
	if groupID != "" {
		return a.deps.LiveAvatar.GroupRecordingSeconds(ctx, userID, groupID)
	}
	return a.deps.LiveAvatar.RecordingSeconds(ctx, userID, voices)
}
