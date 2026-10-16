package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/insights"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
	"github.com/google/uuid"
)

// InsightsService reads engagement and recommends posting times.
type InsightsService interface {
	Latest(ctx context.Context, userID, postID string) (insights.Metrics, error)
	History(ctx context.Context, userID, postID string) ([]insights.Metrics, error)
	Recommend(ctx context.Context, userID string, platform social.Platform) ([]insights.Slot, error)
}

// getPostMetrics returns the newest snapshot plus recent history. A post with
// nothing collected yet is an empty history, not an error: collection runs on
// its own schedule after publishing.
func (a *App) getPostMetrics(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusNotFound, "not_found", "post not found")
		return
	}
	latest, err := a.deps.Insights.Latest(r.Context(), identity.UserID, id)
	switch {
	case errors.Is(err, insights.ErrNoMetrics):
		writeData(w, http.StatusOK, map[string]any{"latest": nil, "history": []insights.Metrics{}})
		return
	case err != nil:
		writeInternal(w, r, err)
		return
	}
	history, err := a.deps.Insights.History(r.Context(), identity.UserID, id)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, map[string]any{"latest": latest, "history": history})
}

// getInsightSlots recommends posting times learned from the account's own
// published posts. Unknown platforms are rejected; thin histories yield an
// empty list with the reason, never generic advice.
func (a *App) getInsightSlots(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	platform := social.Platform(r.URL.Query().Get("platform"))
	if !platform.Valid() {
		writeError(w, http.StatusBadRequest, "invalid_request", "platform must be tiktok, instagram, or youtube")
		return
	}
	slots, err := a.deps.Insights.Recommend(r.Context(), identity.UserID, platform)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if slots == nil {
		slots = []insights.Slot{}
	}
	writeData(w, http.StatusOK, map[string]any{"slots": slots})
}
