package httpserver

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
	"github.com/google/uuid"
)

type registerAvatarRequest struct {
	StoragePath      string `json:"storage_path"`
	Name             string `json:"name"`
	ConsentConfirmed bool   `json:"consent_confirmed"`
	ConsentVersion   int    `json:"consent_version"`
	RerouteURL       string `json:"reroute_url"`
}

// registerAvatar records the avatar and returns at once; HeyGen training, the
// consent step and readiness are tracked in the background and pushed as
// avatar.updated events.
func (a *App) registerAvatar(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req registerAvatarRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	avatar, isNew, err := a.deps.Avatars.Register(r.Context(), identity.UserID, avatars.RegisterInput{
		StoragePath: req.StoragePath, Name: req.Name, ConsentVersion: req.ConsentVersion,
		ConsentConfirmed: req.ConsentConfirmed, RerouteURL: req.RerouteURL, IdempotencyKey: r.Header.Get("Idempotency-Key"),
	})
	switch {
	case err == nil && isNew:
		writeData(w, http.StatusAccepted, avatar)
	case err == nil:
		writeData(w, http.StatusOK, avatar)
	default:
		a.avatarError(w, r, err)
	}
}

func (a *App) listAvatars(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	limit, offset, ok := pageParams(w, r)
	if !ok {
		return
	}
	list, more, err := a.deps.Avatars.List(r.Context(), identity.UserID, limit, offset)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": list, "pagination": pagination{Limit: limit, Offset: offset, HasMore: more}})
}

func (a *App) getAvatar(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := a.avatarRequest(w, r)
	if !ok {
		return
	}
	avatar, err := a.deps.Avatars.Get(r.Context(), identity.UserID, id)
	if err != nil {
		a.avatarError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, avatar)
}

// refreshAvatarConsent issues a new hosted consent link; the old one expires after 24 hours.
func (a *App) refreshAvatarConsent(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := a.avatarRequest(w, r)
	if !ok {
		return
	}
	avatar, err := a.deps.Avatars.RefreshConsent(r.Context(), identity.UserID, id)
	if err != nil {
		a.avatarError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, avatar)
}

type selectVoiceRequest struct {
	VoiceID string `json:"voice_id"`
}

// selectAvatarVoice associates a voice with an avatar.
func (a *App) selectAvatarVoice(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := a.avatarRequest(w, r)
	if !ok {
		return
	}
	var req selectVoiceRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.VoiceID == "" || len(req.VoiceID) > 200 {
		writeError(w, http.StatusBadRequest, "invalid_request", "voice_id is required")
		return
	}
	avatar, err := a.deps.Avatars.SelectVoice(r.Context(), identity.UserID, id, req.VoiceID)
	if err != nil {
		a.avatarError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, avatar)
}

func (a *App) avatarRequest(w http.ResponseWriter, r *http.Request) (auth.Identity, string, bool) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return auth.Identity{}, "", false
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "avatar id must be a UUID")
		return auth.Identity{}, "", false
	}
	return identity, id, true
}

func (a *App) avatarError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, avatars.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "avatar not found")
	case errors.Is(err, avatars.ErrConsentRequired):
		writeError(w, http.StatusBadRequest, "consent_required", "you must confirm consent to create an avatar of yourself")
	case errors.Is(err, avatars.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, avatars.ErrFootageMissing):
		writeError(w, http.StatusBadRequest, "recording_not_found", "the recording was not found; upload it again")
	case errors.Is(err, avatars.ErrFootageTooLarge):
		writeError(w, http.StatusRequestEntityTooLarge, "recording_too_large", "the recording is larger than 200 MB")
	case errors.Is(err, avatars.ErrUnsupportedMedia):
		writeError(w, http.StatusUnsupportedMediaType, "unsupported_recording", "the recording must be MP4 or WebM")
	case errors.Is(err, avatars.ErrLimitReached):
		writeError(w, http.StatusConflict, "avatar_limit_reached", "you have reached the avatar limit; delete one first")
	case errors.Is(err, avatars.ErrTooManyBusy):
		w.Header().Set("Retry-After", "60")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "an avatar is already being created; wait for it to finish")
	case errors.Is(err, avatars.ErrNotReady):
		writeError(w, http.StatusConflict, "avatar_not_ready", "the avatar is not ready yet")
	case errors.Is(err, avatars.ErrVoiceNotAllowed):
		writeError(w, http.StatusForbidden, "voice_not_allowed", "that voice is not available to you")
	case writeCreditError(w, err):
	default:
		writeInternal(w, r, err)
	}
}

// deleteAvatar erases an avatar at HeyGen, in storage and in the database.
func (a *App) deleteAvatar(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := a.avatarRequest(w, r)
	if !ok {
		return
	}
	if err := a.deps.Avatars.Delete(r.Context(), identity.UserID, id); err != nil {
		if errors.Is(err, avatars.ErrNotFound) {
			w.WriteHeader(http.StatusNoContent) // already gone is the outcome the caller wanted
			return
		}
		slog.Error("avatar deletion failed", "avatar_id", id, "error", err)
		writeError(w, http.StatusBadGateway, "delete_failed", "the avatar could not be fully deleted; nothing was removed, try again")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) setDefaultAvatar(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := a.avatarRequest(w, r)
	if !ok {
		return
	}
	avatar, err := a.deps.Avatars.SetDefault(r.Context(), identity.UserID, id)
	if err != nil {
		a.avatarError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, avatar)
}
