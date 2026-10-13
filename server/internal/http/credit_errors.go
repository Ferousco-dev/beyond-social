package httpserver

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
)

// writeCreditError answers the two credit failures and reports whether it did.
func writeCreditError(w http.ResponseWriter, err error) bool {
	switch {
	case errors.Is(err, credits.ErrInsufficient):
		writeError(w, http.StatusPaymentRequired, "insufficient_credits", "you do not have enough credits for this")
	case errors.Is(err, credits.ErrUnavailable):
		writeError(w, http.StatusServiceUnavailable, "unavailable", "this is not available right now")
	case errors.Is(err, credits.ErrUpgradeRequired):
		var upgrade *credits.UpgradeError
		message := "this is part of the Pro plan"
		if errors.As(err, &upgrade) {
			message = upgrade.Reason
		}
		writeError(w, http.StatusForbidden, "upgrade_required", message)
	case errors.Is(err, credits.ErrLimitReached):
		var limit *credits.LimitError
		errors.As(err, &limit)
		w.Header().Set("Retry-After", strconv.Itoa(max(int(time.Until(limit.ResetsAt).Seconds()), 1)))
		name := "five hour"
		if limit.Window == credits.WindowWeek {
			name = "weekly"
		}
		writeJSON(w, http.StatusTooManyRequests, errorBody{Error: apiError{
			Code: "usage_limit", ResetsAt: &limit.ResetsAt,
			Message: "you have reached your " + name + " usage limit; it refills at " + limit.ResetsAt.UTC().Format("Mon 15:04 UTC") + ", or you can turn on extra usage",
		}})
	case errors.Is(err, credits.ErrDailyLimit):
		w.Header().Set("Retry-After", "3600")
		writeError(w, http.StatusTooManyRequests, "daily_limit", "you have reached your daily credit limit; try again later")
	default:
		return false
	}
	return true
}

func logAuditFailure(action, target string, err error) {
	slog.Error("record admin audit entry", "action", action, "target", target, "error", err)
}
