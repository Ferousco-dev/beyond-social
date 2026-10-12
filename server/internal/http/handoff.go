package httpserver

import (
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/handoff"
)

// uploadTicket is for the signed-in user's own browser: a slot to upload a recording.
func (a *App) uploadTicket(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		ContentType string `json:"content_type"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	ticket, err := a.deps.Avatars.NewUploadTicket(r.Context(), identity.UserID, req.ContentType)
	if err != nil {
		a.avatarError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, ticket)
}

// mintHandoff issues the token behind the "record on your phone" QR code.
func (a *App) mintHandoff(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	minted, err := a.deps.Handoff.Mint(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusCreated, minted)
}

// handoffStatus tells the phone's landing page whether its link is still good.
func (a *App) handoffStatus(w http.ResponseWriter, r *http.Request) {
	valid, err := a.deps.Handoff.Valid(r.Context(), r.PathValue("token"))
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if !valid {
		writeError(w, http.StatusNotFound, "invalid_link", "this link is no longer valid")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) handoffTicket(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ContentType string `json:"content_type"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	ticket, err := a.deps.Handoff.Ticket(r.Context(), r.PathValue("token"), req.ContentType)
	if err != nil {
		a.handoffError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, ticket)
}

func (a *App) handoffClaim(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path string `json:"path"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if _, err := a.deps.Handoff.Claim(r.Context(), r.PathValue("token"), req.Path); err != nil {
		a.handoffError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) handoffError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, handoff.ErrInvalidLink) {
		// One answer for expired, used, malformed and unknown links.
		writeError(w, http.StatusNotFound, "invalid_link", "this link is no longer valid")
		return
	}
	a.avatarError(w, r, err)
}
