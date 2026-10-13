package httpserver

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/google/uuid"
)

const maxAdminBody = 4 << 10

func decodeAdminBody(w http.ResponseWriter, r *http.Request, into any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxAdminBody))
	dec.DisallowUnknownFields()
	if err := dec.Decode(into); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "the request body is not valid")
		return false
	}
	return true
}

func (a *App) adminError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, credits.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", "that value is not allowed")
	case errors.Is(err, credits.ErrUnavailable):
		writeError(w, http.StatusNotFound, "not_found", "no such item")
	default:
		writeInternal(w, r, err)
	}
}

func (a *App) listPrices(w http.ResponseWriter, r *http.Request) {
	rows, err := a.deps.CreditAdmin.Prices(r.Context())
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, rows)
}

func (a *App) updatePrice(w http.ResponseWriter, r *http.Request) {
	var patch credits.PricePatch
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok || !decodeAdminBody(w, r, &patch) {
		return
	}
	row, err := a.deps.CreditAdmin.UpdatePrice(r.Context(), r.PathValue("action"), patch, identity.UserID)
	if err != nil {
		a.adminError(w, r, err)
		return
	}
	a.audit(r, identity.UserID, "price.update", row.Action, map[string]any{"credits": row.Credits, "enabled": row.Enabled})
	writeData(w, http.StatusOK, row)
}

func (a *App) listCreditSettings(w http.ResponseWriter, r *http.Request) {
	rows, err := a.deps.CreditAdmin.Settings(r.Context())
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, rows)
}

func (a *App) updateCreditSetting(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Value int `json:"value"`
	}
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok || !decodeAdminBody(w, r, &body) {
		return
	}
	key := r.PathValue("key")
	if err := a.deps.CreditAdmin.SetSetting(r.Context(), key, body.Value, identity.UserID); err != nil {
		a.adminError(w, r, err)
		return
	}
	a.audit(r, identity.UserID, "setting.update", key, map[string]any{"value": body.Value})
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) findCreditUsers(w http.ResponseWriter, r *http.Request) {
	limit, err := intParam(r, "limit", 20, 1, 100)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	users, err := a.deps.CreditAdmin.FindUsers(r.Context(), r.URL.Query().Get("q"), credits.Segment(r.URL.Query().Get("segment")), limit)
	if err != nil {
		a.adminError(w, r, err)
		return
	}
	writeData(w, http.StatusOK, users)
}

func (a *App) userLedger(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "user id must be a UUID")
		return
	}
	balance, err := a.balance(r.Context(), id)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	rows, err := a.deps.CreditAdmin.Ledger(r.Context(), id, 100)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, map[string]any{"balance": balance, "history": rows})
}

func (a *App) adjustCredits(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Amount int    `json:"amount"`
		Reason string `json:"reason"`
	}
	identity, ok := auth.IdentityFromContext(r.Context())
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "user id must be a UUID")
		return
	}
	if !ok || !decodeAdminBody(w, r, &body) {
		return
	}
	// A fresh key per request: an adjustment is deliberate, never deduplicated.
	balance, err := a.deps.CreditLedger.Adjust(r.Context(), id, body.Amount, "adjust:"+uuid.NewString(), body.Reason, identity.UserID)
	switch {
	case errors.Is(err, credits.ErrInsufficient):
		writeError(w, http.StatusConflict, "insufficient_credits", "that would take the balance below zero")
	case err != nil && body.Reason == "" || err != nil && body.Amount == 0:
		writeError(w, http.StatusBadRequest, "invalid_request", "an amount and a reason are required")
	case err != nil:
		writeInternal(w, r, err)
	default:
		a.audit(r, identity.UserID, "credits.adjust", id, map[string]any{"amount": body.Amount, "reason": body.Reason})
		writeData(w, http.StatusOK, map[string]any{"balance": balance})
	}
}

func (a *App) creditUsage(w http.ResponseWriter, r *http.Request) {
	days, err := intParam(r, "days", 7, 1, 90)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	rows, err := a.deps.CreditAdmin.Usage(r.Context(), days)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, rows)
}

// audit records an admin action. The change has already happened, so a failure
// to record it is logged rather than undone.
func (a *App) audit(r *http.Request, actor, action, target string, detail map[string]any) {
	if a.deps.Audit == nil {
		return
	}
	if err := a.deps.Audit.Record(r.Context(), actor, action, target, detail); err != nil {
		logAuditFailure(action, target, err)
	}
}

func (a *App) userSegments(w http.ResponseWriter, r *http.Request) {
	counts, err := a.deps.CreditAdmin.SegmentCounts(r.Context())
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, counts)
}
