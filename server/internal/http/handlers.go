package httpserver

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/buildinfo"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
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
		"status":  "ready",
		"version": buildinfo.Commit,
		"checks":  map[string]string{"database": "ok"},
	})
}

func (a *App) me(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	profile, ok := r.Context().Value(activeProfileKey{}).(accounts.Profile)
	if !ok {
		var err error
		if profile, err = a.deps.Accounts.Active(r.Context(), identity.UserID, identity.Email, identity.Name); err != nil {
			a.accountError(w, r, err)
			return
		}
	}
	// Balance and plan are separate reads; asking for both at once halves the wait.
	var (
		balance             int
		plan                credits.Plan
		balanceErr, planErr error
		wg                  sync.WaitGroup
	)
	wg.Add(2)
	go func() { defer wg.Done(); balance, balanceErr = a.balance(r.Context(), profile.ID) }()
	go func() { defer wg.Done(); plan, planErr = a.deps.Usage.PlanOf(r.Context(), profile.ID) }()
	wg.Wait()
	if err := errors.Join(balanceErr, planErr); err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, map[string]any{
		"user_id": profile.ID, "email": profile.Email, "name": profile.DisplayName,
		"role": profile.Role, "industry": profile.Industry, "credits": balance, "plan": plan, "created_at": profile.CreatedAt,
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
// activeProfileKey carries the profile the account check loaded, so a handler
// that needs it does not load it again.
type activeProfileKey struct{}

func (a *App) requireActiveAccount(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, ok := auth.IdentityFromContext(r.Context())
		if !ok {
			writeUnauthorized(w)
			return
		}
		profile, err := a.deps.Accounts.ActiveWithDetails(r.Context(), identity.UserID, identity.Email, identity.Name, accounts.RegistrationDetails{
			Phone: identity.Phone, BusinessName: identity.BusinessName, Industry: identity.Industry,
		})
		if err != nil {
			a.accountError(w, r, err)
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), activeProfileKey{}, profile)))
	})
}
