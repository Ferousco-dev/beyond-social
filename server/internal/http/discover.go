package httpserver

import (
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/discovery"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
	"github.com/google/uuid"
)

type discoverRequest struct {
	Platform video.Platform `json:"platform"`
	Query    string         `json:"query"`
	URL      string         `json:"url"`
	Limit    int            `json:"limit"`
}

// createDiscovery queues a search and returns at once; results arrive through
// discovery.updated events or by polling the discovery.
func (a *App) createDiscovery(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req discoverRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	d, err := a.deps.Discovery.Create(r.Context(), identity.UserID, discovery.Params{
		Platform: req.Platform, Query: req.Query, URL: req.URL, Limit: req.Limit,
	})
	switch {
	case errors.Is(err, discovery.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, discovery.ErrTooManyBusy):
		w.Header().Set("Retry-After", "10")
		writeError(w, http.StatusTooManyRequests, "too_many_requests", "too many searches in progress; wait for one to finish")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusAccepted, d)
	}
}

func (a *App) getDiscovery(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := a.discoveryRequest(w, r)
	if !ok {
		return
	}
	d, err := a.deps.Discovery.Get(r.Context(), identity.UserID, id)
	if a.discoveryError(w, r, err) {
		return
	}
	writeData(w, http.StatusOK, d)
}

func (a *App) listDiscoveryVideos(w http.ResponseWriter, r *http.Request) {
	identity, id, ok := a.discoveryRequest(w, r)
	if !ok {
		return
	}
	limit, offset, ok := pageParams(w, r)
	if !ok {
		return
	}
	videos, hasMore, err := a.deps.Discovery.Videos(r.Context(), identity.UserID, id, limit, offset)
	if a.discoveryError(w, r, err) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data":       videos,
		"pagination": pagination{Limit: limit, Offset: offset, HasMore: hasMore},
	})
}

func (a *App) discoveryRequest(w http.ResponseWriter, r *http.Request) (auth.Identity, string, bool) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return auth.Identity{}, "", false
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "discovery id must be a UUID")
		return auth.Identity{}, "", false
	}
	return identity, id, true
}

// discoveryError writes the response for a failed lookup and reports whether it did.
func (a *App) discoveryError(w http.ResponseWriter, r *http.Request, err error) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, discovery.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "discovery not found")
	default:
		writeInternal(w, r, err)
	}
	return true
}
