package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/assets"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/google/uuid"
)

// AssetGroups manages named face/voice/product/environment bundles.
type AssetGroups interface {
	List(ctx context.Context, userID string) ([]assets.Group, error)
	Create(ctx context.Context, userID, name string) (assets.Group, error)
	Detail(ctx context.Context, userID, id string) (assets.GroupDetail, error)
	Set(ctx context.Context, userID, id string, slots assets.Slots, extras []assets.Extra) (assets.Group, error)
	Rename(ctx context.Context, userID, id, name string) (assets.Group, error)
	Consent(ctx context.Context, userID, id, kind string) (assets.Group, error)
	Delete(ctx context.Context, userID, id string) error
}

func (a *App) listAssetGroups(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	groups, err := a.deps.AssetGroups.List(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if groups == nil {
		groups = []assets.Group{}
	}
	writeData(w, http.StatusOK, groups)
}

type assetGroupCreateRequest struct {
	Name string `json:"name"`
}

func (a *App) createAssetGroup(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req assetGroupCreateRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	group, err := a.deps.AssetGroups.Create(r.Context(), identity.UserID, req.Name)
	switch {
	case errors.Is(err, assets.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, assets.ErrNameTaken):
		writeError(w, http.StatusConflict, "name_taken", err.Error())
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusCreated, group)
	}
}

func (a *App) getAssetGroup(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "group id must be a UUID")
		return
	}
	detail, err := a.deps.AssetGroups.Detail(r.Context(), identity.UserID, id)
	switch {
	case errors.Is(err, assets.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "asset group not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, detail)
	}
}

type assetGroupUpdateRequest struct {
	Name   *string        `json:"name"`
	Slots  *assets.Slots  `json:"slots"`
	Extras []assets.Extra `json:"extras"`
}

// updateAssetGroup renames and/or refills a group in one call. Omitted fields
// stay as they are; extras replace the whole extra list.
func (a *App) updateAssetGroup(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "group id must be a UUID")
		return
	}
	var req assetGroupUpdateRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	group, err := a.currentGroup(r.Context(), identity.UserID, id)
	switch {
	case errors.Is(err, assets.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "asset group not found")
	case err != nil:
		writeInternal(w, r, err)
		return
	}
	if req.Name != nil {
		group, err = a.deps.AssetGroups.Rename(r.Context(), identity.UserID, id, *req.Name)
		if err != nil {
			writeAssetGroupError(w, r, err)
			return
		}
	}
	if req.Slots != nil || req.Extras != nil {
		slots, extras := group.Slots, group.Extras
		if req.Slots != nil {
			slots = *req.Slots
		}
		if req.Extras != nil {
			extras = req.Extras
		}
		group, err = a.deps.AssetGroups.Set(r.Context(), identity.UserID, id, slots, extras)
		if err != nil {
			writeAssetGroupError(w, r, err)
			return
		}
	}
	writeData(w, http.StatusOK, group)
}

func (a *App) currentGroup(ctx context.Context, userID, id string) (assets.Group, error) {
	detail, err := a.deps.AssetGroups.Detail(ctx, userID, id)
	if err != nil {
		return assets.Group{}, err
	}
	return detail.Group, nil
}

func (a *App) deleteAssetGroup(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "group id must be a UUID")
		return
	}
	switch err := a.deps.AssetGroups.Delete(r.Context(), identity.UserID, id); {
	case errors.Is(err, assets.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "asset group not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

func (a *App) consentAssetGroup(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "group id must be a UUID")
		return
	}
	var req struct {
		Kind string `json:"kind"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	group, err := a.deps.AssetGroups.Consent(r.Context(), identity.UserID, id, req.Kind)
	if err != nil {
		writeAssetGroupError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, group)
}

func writeAssetGroupError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, assets.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, assets.ErrNameTaken):
		writeError(w, http.StatusConflict, "name_taken", err.Error())
	case errors.Is(err, assets.ErrMediaNotUsable):
		writeError(w, http.StatusUnprocessableEntity, "unusable_media", err.Error())
	case errors.Is(err, assets.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "asset group not found")
	default:
		writeInternal(w, r, err)
	}
}
