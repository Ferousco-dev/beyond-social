package httpserver

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
)

// writeCreditError answers the two credit failures and reports whether it did.
func writeCreditError(w http.ResponseWriter, err error) bool {
	switch {
	case errors.Is(err, credits.ErrInsufficient):
		writeError(w, http.StatusPaymentRequired, "insufficient_credits", "you do not have enough credits for this")
	case errors.Is(err, credits.ErrUnavailable):
		writeError(w, http.StatusServiceUnavailable, "unavailable", "this is not available right now")
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
