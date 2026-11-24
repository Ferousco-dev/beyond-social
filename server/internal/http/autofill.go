package httpserver

import (
	"context"
	"errors"
	"math"
	"net/http"
	"strconv"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/autofill"
)

// Autofill writes the video form's answers from one sentence.
type Autofill interface {
	Fill(ctx context.Context, userID, idea string) (autofill.Brief, error)
}

// autofillsPerHour caps the free form filling, which costs a model call.
const autofillsPerHour = 30

func (a *App) composeBrief(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	if a.deps.Autofill == nil {
		writeError(w, http.StatusNotFound, "not_found", "filling the form is not available")
		return
	}
	var req struct {
		Idea string `json:"idea"`
	}
	if !decodeJSONLimit(w, r, &req, 16<<10) {
		return
	}
	if allowed, wait := a.autofills.allow(identity.UserID); !allowed {
		w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(wait.Seconds()))))
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "you have filled the form many times this hour; fill it in yourself or try again later")
		return
	}
	brief, err := a.deps.Autofill.Fill(r.Context(), identity.UserID, req.Idea)
	switch {
	case errors.Is(err, autofill.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", "describe the video in a sentence or two")
	case errors.Is(err, autofill.ErrUnavailable):
		writeError(w, http.StatusBadGateway, "provider_unavailable", "our AI could not fill it in right now; try again or fill it in yourself")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, brief)
	}
}
