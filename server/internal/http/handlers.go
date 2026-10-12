package httpserver

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
)

const readyTimeout = 5 * time.Second

// health only says the process is up; it must stay free of dependencies so a
// database outage does not get the container restarted.
func (a *App) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *App) ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), readyTimeout)
	defer cancel()

	if err := a.deps.Database.Ping(ctx); err != nil {
		slog.Warn("readiness check failed", "dependency", "database", "error", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status": "unavailable",
			"checks": map[string]string{"database": "unavailable"},
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ready",
		"checks": map[string]string{"database": "ok"},
	})
}

func (a *App) me(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	profile, err := a.deps.Accounts.Active(r.Context(), identity.UserID, identity.Email, identity.Name)
	if err != nil {
		a.accountError(w, r, err)
		return
	}
	balance, err := a.balance(r.Context(), profile.ID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, map[string]any{
		"user_id": profile.ID, "email": profile.Email, "name": profile.DisplayName,
		"role": profile.Role, "credits": balance, "created_at": profile.CreatedAt,
	})
}

func (a *App) accountError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, accounts.ErrDeleted):
		writeError(w, http.StatusForbidden, "account_deleted", "this account has been deleted")
	case errors.Is(err, accounts.ErrSuspended):
		writeError(w, http.StatusForbidden, "account_suspended", "this account is suspended")
	default:
		writeInternal(w, r, err)
	}
}

// requireActiveAccount runs after authentication on every protected route. It
// creates the profile on first use and refuses suspended or deleted accounts,
// so those states hold for the whole API, not only for /me.
func (a *App) requireActiveAccount(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, ok := auth.IdentityFromContext(r.Context())
		if !ok {
			writeUnauthorized(w)
			return
		}
		if _, err := a.deps.Accounts.Active(r.Context(), identity.UserID, identity.Email, identity.Name); err != nil {
			a.accountError(w, r, err)
			return
		}
		next.ServeHTTP(w, r)
	})
}
