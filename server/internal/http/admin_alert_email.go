package httpserver

import (
	"context"
	"log/slog"
	"net/http"
	"net/mail"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
)

// AlertEmailKey is where the address that receives provider alerts is stored.
const AlertEmailKey = "alerts.email"

// AlertTester sends the sample alert that confirms a newly saved address.
type AlertTester interface {
	AlertTest(ctx context.Context, to string) error
}

func (a *App) getAlertEmail(w http.ResponseWriter, r *http.Request) {
	to, found, err := a.deps.EmailSettings.Get(r.Context(), AlertEmailKey)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if !found {
		to = ""
	}
	writeData(w, http.StatusOK, map[string]string{"email": to})
}

// setAlertEmail saves the address alerts go to; an empty one stops them. A new
// address is sent a sample alert, so the admin sees one arrive.
func (a *App) setAlertEmail(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		Email string `json:"email"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	to := strings.TrimSpace(req.Email)
	if to != "" {
		parsed, err := mail.ParseAddress(to)
		if err != nil || parsed.Address != to || len(to) > 254 {
			writeError(w, http.StatusBadRequest, "invalid_request", "enter one email address, like you@example.com")
			return
		}
	}
	if err := a.deps.EmailSettings.Set(r.Context(), AlertEmailKey, to, identity.UserID); err != nil {
		writeInternal(w, r, err)
		return
	}
	a.audit(r, identity.UserID, "alerts.email", "email", map[string]any{"set": to != ""})
	if to != "" && a.deps.AlertMail != nil {
		if err := a.deps.AlertMail.AlertTest(r.Context(), to); err != nil {
			// Saved either way; the page says the sample could not be sent.
			slog.Warn("alert test email", "error", err)
			writeData(w, http.StatusOK, map[string]any{"email": to, "test_sent": false})
			return
		}
	}
	writeData(w, http.StatusOK, map[string]any{"email": to, "test_sent": to != ""})
}
