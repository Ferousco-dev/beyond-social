package httpserver

import (
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/google/uuid"
)

// requireAdmin lets only users whose profile role is admin through. Anyone else
// gets 404, so the existence of admin routes is not advertised.
func (a *App) requireAdmin(next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
		if profile.Role != accounts.RoleAdmin {
			writeError(w, http.StatusNotFound, "not_found", "no such route")
			return
		}
		next(w, r)
	})
}

func (a *App) listAlerts(w http.ResponseWriter, r *http.Request) {
	limit, err := intParam(r, "limit", 50, 1, 200)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	list, err := a.deps.Alerts.List(r.Context(), r.URL.Query().Get("open") != "false", limit)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, list)
}

func (a *App) resolveAlert(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "alert id must be a UUID")
		return
	}
	resolved, err := a.deps.Alerts.Resolve(r.Context(), id)
	switch {
	case err != nil:
		writeInternal(w, r, err)
	case !resolved:
		writeError(w, http.StatusNotFound, "not_found", "alert not found or already resolved")
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}
