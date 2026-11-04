package httpserver

import (
	"context"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
	"github.com/Ferousco-dev/beyond-social/server/internal/mailer"
)

type RevenueHistoryReader interface {
	RevenueHistory(ctx context.Context, days int) ([]billing.RevenuePoint, error)
}

func (a *App) billingOverview(w http.ResponseWriter, r *http.Request) {
	info, err := a.deps.Usage.Info(r.Context())
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	overview, err := a.deps.BillingAdmin.Overview(r.Context(), info.ProPriceCents)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, overview)
}

func (a *App) billingRevenueHistory(w http.ResponseWriter, r *http.Request) {
	days, err := intParam(r, "days", 30, 7, 90)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	points, err := a.deps.RevenueHistory.RevenueHistory(r.Context(), days)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, points)
}

// EmailSettings reads and changes the From address of the product's emails.
type EmailSettings interface {
	Get(ctx context.Context, key string) (string, bool, error)
	Set(ctx context.Context, key, value, actor string) error
}

// EmailFromKey is where the From address is stored.
const EmailFromKey = "email.from"

func (a *App) getEmailFrom(w http.ResponseWriter, r *http.Request) {
	from, found, err := a.deps.EmailSettings.Get(r.Context(), EmailFromKey)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if !found {
		from = ""
	}
	writeData(w, http.StatusOK, map[string]string{"from": from, "default": mailer.DefaultFrom})
}

func (a *App) setEmailFrom(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		From string `json:"from"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	from := strings.TrimSpace(req.From)
	// A From address is a name and an address, such as Beyond Social <hello@example.com>.
	if from == "" || utf8.RuneCountInString(from) > 120 || strings.ContainsAny(from, "\r\n") || !strings.Contains(from, "@") {
		writeError(w, http.StatusBadRequest, "invalid_request", "use an address like Beyond Social <hello@yourdomain.com>")
		return
	}
	if err := a.deps.EmailSettings.Set(r.Context(), EmailFromKey, from, identity.UserID); err != nil {
		writeInternal(w, r, err)
		return
	}
	a.audit(r, identity.UserID, "email.from", "email", map[string]any{})
	w.WriteHeader(http.StatusNoContent)
}
