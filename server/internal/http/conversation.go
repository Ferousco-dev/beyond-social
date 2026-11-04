package httpserver

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kietools"
)

type conversationRequest struct {
	Turns []struct {
		FaceAssetID  string `json:"face_asset_id"`
		VoiceAssetID string `json:"voice_asset_id"`
		Script       string `json:"script"`
	} `json:"turns"`
	Prompt string `json:"prompt"`
}

// conversationResponse lists the started turns in order. When a later turn
// could not start (for example credits ran out), the earlier ones still run
// and Error says why the rest did not.
type conversationResponse struct {
	Jobs  []jobs.Job `json:"jobs"`
	Error string     `json:"error,omitempty"`
}

func (a *App) createConversationVideo(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req conversationRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	turns := make([]kietools.Turn, len(req.Turns))
	for i, turn := range req.Turns {
		turns[i] = kietools.Turn{FaceAssetID: turn.FaceAssetID, VoiceAssetID: turn.VoiceAssetID, Script: turn.Script}
	}
	started, err := a.deps.LiveAvatar.SubmitConversation(r.Context(), identity.UserID, turns, req.Prompt, r.Header.Get("Idempotency-Key"))
	switch {
	case err == nil:
		writeData(w, http.StatusAccepted, conversationResponse{Jobs: started})
	case len(started) > 0:
		slog.Warn("conversation started partly", "user", identity.UserID, "started", len(started), "turns", len(turns), "error", err)
		writeData(w, http.StatusAccepted, conversationResponse{Jobs: started, Error: fmt.Sprintf(
			"Only %d of %d turns started. Check your credits, then make the rest again.", len(started), len(turns))})
	case errors.Is(err, kietools.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", conversationRefusal(err))
	case errors.Is(err, kietools.ErrTooManyBusy):
		w.Header().Set("Retry-After", "30")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "you have too many videos in progress; wait for one to finish")
	case writeCreditError(w, err):
	default:
		writeInternal(w, r, err)
	}
}

// conversationRefusal names the turn and the reason when one asset was
// refused ("turn 2: ..."), or gives the general rule.
func conversationRefusal(err error) string {
	general := "Give every turn a consented face, a consented voice recording and its words; a conversation has 2 to 6 turns."
	turn, _, found := strings.Cut(err.Error(), ": ")
	if !found || !strings.HasPrefix(turn, "turn ") {
		return general
	}
	return "Turn " + strings.TrimPrefix(turn, "turn ") + ": " + strings.TrimPrefix(liveAvatarRefusal(err), "The face or voice cannot be used: ")
}
