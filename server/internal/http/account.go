package httpserver

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
)

func (a *App) renameMe(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	profile, err := a.deps.Accounts.Rename(r.Context(), identity.UserID, req.Name)
	switch {
	case errors.Is(err, accounts.ErrInvalidName):
		writeError(w, http.StatusBadRequest, "invalid_request", "the name must be 1 to 80 characters")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, map[string]string{"name": profile.DisplayName})
	}
}

// deleteMe closes the caller's own account. It is refused while a Pro
// subscription is running, because deleting would not stop the billing.
func (a *App) deleteMe(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		ConfirmEmail string `json:"confirm_email"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	profile, err := a.deps.Accounts.Active(r.Context(), identity.UserID, identity.Email, identity.Name)
	if err != nil {
		a.accountError(w, r, err)
		return
	}
	plan, err := a.deps.Usage.PlanOf(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if plan == credits.PlanPro {
		writeError(w, http.StatusConflict, "subscription_active", "cancel your Pro subscription before deleting your account")
		return
	}
	switch err := a.deps.Accounts.Delete(r.Context(), profile.ID, profile.Email, req.ConfirmEmail, a.deps.SignIns); {
	case errors.Is(err, accounts.ErrConfirmMismatch):
		writeError(w, http.StatusBadRequest, "invalid_request", "type your account email exactly to confirm")
	case err != nil:
		writeInternal(w, r, err)
	default:
		a.audit(r, profile.ID, "account.delete", profile.ID, map[string]any{})
		a.erase(profile.ID)
		w.WriteHeader(http.StatusNoContent)
	}
}

// erase starts removing what the account made. It runs on its own so the person
// is not kept waiting on HeyGen and storage; if it fails, the purge job retries.
func (a *App) erase(userID string) {
	if a.deps.Purger == nil {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		if err := a.deps.Purger.Purge(ctx, userID); err != nil {
			slog.Error("erase deleted account", "user", userID, "error", err)
		}
	}()
}
