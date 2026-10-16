package httpserver

import (
	"context"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/google/uuid"
)

type AdminProfileStore interface {
	SetSuspended(ctx context.Context, userID string, suspended bool) (bool, error)
}

func (a *App) setUserSuspension(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	targetID, err := uuid.Parse(id)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "user id must be a UUID")
		return
	}
	id = targetID.String()
	var req struct {
		Suspended *bool `json:"suspended"`
	}
	if !decodeAdminBody(w, r, &req) {
		return
	}
	if req.Suspended == nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "suspended is required")
		return
	}
	requesterID, err := uuid.Parse(identity.UserID)
	if err == nil && *req.Suspended && targetID == requesterID {
		writeError(w, http.StatusConflict, "self_suspension", "admins cannot suspend their own account")
		return
	}
	updated, err := a.deps.AdminProfiles.SetSuspended(r.Context(), id, *req.Suspended)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if !updated {
		writeError(w, http.StatusNotFound, "not_found", "user not found")
		return
	}
	a.audit(r, identity.UserID, "user.suspension.update", id, map[string]any{"suspended": *req.Suspended})
	writeData(w, http.StatusOK, map[string]bool{"suspended": *req.Suspended})
}
