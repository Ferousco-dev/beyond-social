package httpserver

import (
	"context"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
)

// UsageService is what the plan and usage endpoints need.
type UsageService interface {
	Usage(ctx context.Context, userID string) (credits.Snapshot, error)
	SetOverage(ctx context.Context, userID string, enabled bool, limit int) error
	PlanOf(ctx context.Context, userID string) (credits.Plan, error)
	Info(ctx context.Context) (credits.PlanInfo, error)
}

const maxOverageCap = 100_000

func (a *App) myUsage(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	snapshot, err := a.deps.Usage.Usage(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	balance, err := a.balance(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, map[string]any{"usage": snapshot, "credits": balance})
}

func (a *App) setOverage(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		Enabled bool `json:"enabled"`
		Cap     int  `json:"cap"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Cap < 0 || req.Cap > maxOverageCap {
		writeError(w, http.StatusBadRequest, "invalid_request", "the monthly cap must be between 0 and 100000 credits")
		return
	}
	plan, err := a.deps.Usage.PlanOf(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if plan != credits.PlanPro {
		writeError(w, http.StatusForbidden, "pro_required", "extra usage is part of the Pro plan")
		return
	}
	if err := a.deps.Usage.SetOverage(r.Context(), identity.UserID, req.Enabled, req.Cap); err != nil {
		writeInternal(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
