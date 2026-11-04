package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/google/uuid"
)

// AssetLibrary manages standalone face, voice, product, environment and other assets.
type AssetLibrary interface {
	List(ctx context.Context, userID string) ([]assetlib.Asset, error)
	Create(ctx context.Context, userID string, kind assetlib.Kind, label, mediaID string) (assetlib.Asset, error)
	Relabel(ctx context.Context, userID, id, label string) (assetlib.Asset, error)
	Consent(ctx context.Context, userID, id string) (assetlib.Asset, error)
	Delete(ctx context.Context, userID, id string) error
}

func (a *App) listLibraryAssets(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	list, err := a.deps.AssetLibrary.List(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, list)
}

func (a *App) createLibraryAsset(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		Kind    string `json:"kind"`
		Label   string `json:"label"`
		MediaID string `json:"media_id"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if _, err := uuid.Parse(req.MediaID); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "media_id must be a UUID")
		return
	}
	asset, err := a.deps.AssetLibrary.Create(r.Context(), identity.UserID, assetlib.Kind(req.Kind), req.Label, req.MediaID)
	if err != nil {
		writeLibraryAssetError(w, r, err)
		return
	}
	writeData(w, http.StatusCreated, asset)
}

func (a *App) relabelLibraryAsset(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := libraryAssetTarget(w, r)
	if !ok {
		return
	}
	var req struct {
		Label string `json:"label"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	asset, err := a.deps.AssetLibrary.Relabel(r.Context(), identity.UserID, id, req.Label)
	if err != nil {
		writeLibraryAssetError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, asset)
}

func (a *App) consentLibraryAsset(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := libraryAssetTarget(w, r)
	if !ok {
		return
	}
	asset, err := a.deps.AssetLibrary.Consent(r.Context(), identity.UserID, id)
	if err != nil {
		writeLibraryAssetError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, asset)
}

func (a *App) deleteLibraryAsset(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := libraryAssetTarget(w, r)
	if !ok {
		return
	}
	if err := a.deps.AssetLibrary.Delete(r.Context(), identity.UserID, id); err != nil {
		writeLibraryAssetError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func libraryAssetTarget(w http.ResponseWriter, r *http.Request) (auth.Identity, string, bool) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return auth.Identity{}, "", false
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "asset id must be a UUID")
		return auth.Identity{}, "", false
	}
	return identity, id, true
}

func writeLibraryAssetError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, assetlib.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, assetlib.ErrLabelTaken):
		writeError(w, http.StatusConflict, "label_taken", err.Error())
	case errors.Is(err, assetlib.ErrMediaNotUsable):
		writeError(w, http.StatusUnprocessableEntity, "unusable_media", err.Error())
	case errors.Is(err, assetlib.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "asset not found")
	default:
		writeInternal(w, r, err)
	}
}
