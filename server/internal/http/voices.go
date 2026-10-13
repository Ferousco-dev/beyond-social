package httpserver

import (
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
)

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
