package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/assets"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
	"github.com/google/uuid"
)

// VoiceCloner clones uploaded samples. *voices.CloneService satisfies it.
type VoiceCloner interface {
	Clone(ctx context.Context, userID, name, mediaID string) (voices.Voice, error)
}

// listVoices returns the caller's own voices first (first page only), then the
// shared HeyGen library, paged by an opaque token.
func (a *App) listVoices(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	limit, err := intParam(r, "limit", defaultPageSize, 1, maxPageSize)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	q := r.URL.Query()
	if gender := q.Get("gender"); gender != "" && gender != "male" && gender != "female" {
		writeError(w, http.StatusBadRequest, "invalid_request", "gender must be male or female")
		return
	}
	if len(q.Get("token")) > 512 || len(q.Get("language")) > 40 {
		writeError(w, http.StatusBadRequest, "invalid_request", "invalid filter")
		return
	}
	page, err := a.deps.Voices.List(r.Context(), identity.UserID, voices.Query{
		Language: q.Get("language"), Gender: q.Get("gender"), Limit: limit, Token: q.Get("token"),
	})
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	voiceList := page.Voices
	if voiceList == nil {
		voiceList = []voices.Voice{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data":       voiceList,
		"pagination": map[string]any{"limit": limit, "has_more": page.HasMore, "next_token": page.NextToken},
	})
}

// cloneVoice turns one uploaded sample into a reusable voice. The sample must
// belong to an asset group whose voice consent the owner already recorded:
// cloning without that attestation is refused, not billed.
func (a *App) cloneVoice(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		Name    string `json:"name"`
		MediaID string `json:"media_id"`
		GroupID string `json:"group_id"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if _, err := uuid.Parse(req.MediaID); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "media_id must be a UUID")
		return
	}
	if _, err := uuid.Parse(req.GroupID); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "group_id must be a UUID")
		return
	}
	group, err := a.deps.AssetGroups.Detail(r.Context(), identity.UserID, req.GroupID)
	switch {
	case errors.Is(err, assets.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "asset group not found")
	case err != nil:
		writeInternal(w, r, err)
		return
	default:
		if group.VoiceConsent == nil {
			writeError(w, http.StatusConflict, "consent_required", "record voice consent on the asset group first")
			return
		}
	}
	voice, err := a.deps.VoiceCloner.Clone(r.Context(), identity.UserID, req.Name, req.MediaID)
	if err != nil {
		writeVoiceCloneError(w, r, err)
		return
	}
	writeData(w, http.StatusCreated, voice)
}

func writeVoiceCloneError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, voices.ErrCloneFailed) {
		writeError(w, http.StatusBadGateway, "provider_unavailable", "voice cloning is unavailable right now")
		return
	}
	writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
}
