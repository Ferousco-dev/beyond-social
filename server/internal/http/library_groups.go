package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/google/uuid"
)

// LibraryGroups files library assets into named groups, such as one person or
// one product, so a video can take a whole group at once.
type LibraryGroups interface {
	ListGroups(ctx context.Context, userID string) ([]assetlib.Group, error)
	CreateGroup(ctx context.Context, userID, name string) (assetlib.Group, error)
	RenameGroup(ctx context.Context, userID, id, name string) (assetlib.Group, error)
	DeleteGroup(ctx context.Context, userID, id string) error
	Assign(ctx context.Context, userID, assetID, groupID string) (assetlib.Asset, error)
}

func (a *App) listLibraryGroups(w http.ResponseWriter, r *http.Request) {
	identity, ok := a.groupsReady(w, r)
	if !ok {
		return
	}
	list, err := a.deps.LibraryGroups.ListGroups(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, list)
}

func (a *App) createLibraryGroup(w http.ResponseWriter, r *http.Request) {
	identity, ok := a.groupsReady(w, r)
	if !ok {
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	group, err := a.deps.LibraryGroups.CreateGroup(r.Context(), identity.UserID, req.Name)
	if err != nil {
		writeLibraryGroupError(w, r, err)
		return
	}
	writeData(w, http.StatusCreated, group)
}

func (a *App) renameLibraryGroup(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := a.groupTarget(w, r)
	if !ok {
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	group, err := a.deps.LibraryGroups.RenameGroup(r.Context(), identity.UserID, id, req.Name)
	if err != nil {
		writeLibraryGroupError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, group)
}

func (a *App) deleteLibraryGroup(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := a.groupTarget(w, r)
	if !ok {
		return
	}
	if err := a.deps.LibraryGroups.DeleteGroup(r.Context(), identity.UserID, id); err != nil {
		writeLibraryGroupError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// assignLibraryGroup puts an asset in a group; an empty group_id takes it out.
func (a *App) assignLibraryGroup(w http.ResponseWriter, r *http.Request) {
	if a.deps.LibraryGroups == nil {
		writeError(w, http.StatusNotFound, "not_found", "groups are not available")
		return
	}
	identity, id, ok := libraryAssetTarget(w, r)
	if !ok {
		return
	}
	var req struct {
		GroupID string `json:"group_id"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.GroupID != "" {
		if _, err := uuid.Parse(req.GroupID); err != nil {
			writeError(w, http.StatusBadRequest, "invalid_request", "group_id must be a UUID")
			return
		}
	}
	asset, err := a.deps.LibraryGroups.Assign(r.Context(), identity.UserID, id, req.GroupID)
	if err != nil {
		writeLibraryGroupError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, asset)
}

func (a *App) groupsReady(w http.ResponseWriter, r *http.Request) (auth.Identity, bool) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return auth.Identity{}, false
	}
	if a.deps.LibraryGroups == nil {
		writeError(w, http.StatusNotFound, "not_found", "groups are not available")
		return auth.Identity{}, false
	}
	return identity, true
}

func (a *App) groupTarget(w http.ResponseWriter, r *http.Request) (auth.Identity, string, bool) {
	identity, ok := a.groupsReady(w, r)
	if !ok {
		return auth.Identity{}, "", false
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "group id must be a UUID")
		return auth.Identity{}, "", false
	}
	return identity, id, true
}

func writeLibraryGroupError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, assetlib.ErrGroupNameTaken):
		writeError(w, http.StatusConflict, "name_taken", err.Error())
	case errors.Is(err, assetlib.ErrTooManyGroups):
		writeError(w, http.StatusConflict, "too_many_groups", err.Error())
	case errors.Is(err, assetlib.ErrGroupNotFound):
		writeError(w, http.StatusNotFound, "not_found", "group not found")
	default:
		writeLibraryAssetError(w, r, err)
	}
}
