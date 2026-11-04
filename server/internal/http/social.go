package httpserver

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/url"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

// SocialService is what the connection endpoints need.
type SocialService interface {
	List(ctx context.Context, userID string) ([]social.Status, error)
	Begin(ctx context.Context, userID string, p social.Platform) (string, error)
	Complete(ctx context.Context, p social.Platform, code, state string) (string, error)
	Disconnect(ctx context.Context, userID string, p social.Platform) error
}

func platformParam(w http.ResponseWriter, r *http.Request) (social.Platform, bool) {
	p := social.Platform(r.PathValue("platform"))
	if !p.Valid() {
		writeError(w, http.StatusNotFound, "not_found", "unknown platform")
		return "", false
	}
	return p, true
}

func (a *App) listSocial(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	list, err := a.deps.Social.List(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, list)
}

func (a *App) connectSocial(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	p, valid := platformParam(w, r)
	if !ok || !valid {
		return
	}
	target, err := a.deps.Social.Begin(r.Context(), identity.UserID, p)
	switch {
	case errors.Is(err, social.ErrNotConfigured):
		writeError(w, http.StatusConflict, "not_configured", "connecting this platform is not available yet")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, map[string]string{"url": target})
	}
}

// socialCallback is where a platform sends the browser back. It carries no
// session: the single-use state proves which user started the sign-in. Every
// outcome is a redirect into the app, never a bare error page.
func (a *App) socialCallback(w http.ResponseWriter, r *http.Request) {
	p, valid := platformParam(w, r)
	if !valid {
		return
	}
	q := r.URL.Query()
	outcome := "connected"
	switch {
	case q.Get("error") != "":
		outcome = "denied"
	case q.Get("code") == "" || q.Get("state") == "":
		outcome = "failed"
	default:
		if _, err := a.deps.Social.Complete(r.Context(), p, q.Get("code"), q.Get("state")); err != nil {
			outcome = "failed"
			slog.Warn("social sign-in failed", "platform", p, "error", err)
		}
	}
	dest := url.Values{"platform": {string(p)}, "status": {outcome}}
	http.Redirect(w, r, a.deps.AppURL+"/dashboard/connections?"+dest.Encode(), http.StatusFound)
}

func (a *App) disconnectSocial(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	p, valid := platformParam(w, r)
	if !ok || !valid {
		return
	}
	err := a.deps.Social.Disconnect(r.Context(), identity.UserID, p)
	switch {
	case errors.Is(err, social.ErrNotConnected):
		writeError(w, http.StatusNotFound, "not_found", "that account is not connected")
	case err != nil:
		writeInternal(w, r, err)
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}
