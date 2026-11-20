package httpserver

import (
	"errors"
	"net/http"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/storyboard"
)

// storyboardWrite plans a video of the chosen length from a script. The input is
// checked before any credit is reserved, so a bad request is never charged.
func (a *App) storyboardWrite(w http.ResponseWriter, r *http.Request) {
	userID, ok := a.editorIdentity(w, r)
	if !ok {
		return
	}
	var req struct {
		Script   string `json:"script"`
		Seconds  int    `json:"seconds"`
		Look     string `json:"look"`
		Language string `json:"language"`
	}
	if !decodeJSONLimit(w, r, &req, 4*storyboard.MaxScriptRunes) {
		return
	}
	in := storyboard.Input{Script: req.Script, Seconds: req.Seconds, Look: strings.TrimSpace(req.Look), Language: strings.TrimSpace(req.Language)}
	if err := in.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", strings.TrimPrefix(err.Error(), storyboard.ErrInvalid.Error()+": "))
		return
	}
	var plan storyboard.Plan
	if !a.charged(w, r, userID, a.deps.StoryboardBiller, func() error {
		var err error
		plan, err = a.deps.Storyboards.Write(r.Context(), in)
		if errors.Is(err, storyboard.ErrInvalid) {
			// The model's answer was unusable, not the request: say so as a failure to write.
			return errors.New("storyboard: unusable model answer")
		}
		return err
	}, "the storyboard could not be written") {
		return
	}
	writeData(w, http.StatusOK, plan)
}
