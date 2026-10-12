package httpserver

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/kie"
)

const maxCallbackBody = 64 << 10

// Reconciler re-reads a provider task and updates its job.
type Reconciler interface {
	Reconcile(ctx context.Context, taskID string)
}

// kieCallback handles KIE's completion webhook. It does not trust the payload:
// when an HMAC key is configured the signature must verify, and in every case
// only the task ID is read from the body. The outcome is then fetched from KIE's
// API with our own key, so a forged, replayed or reordered callback can at worst
// trigger a harmless re-check.
func (a *App) kieCallback(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxCallbackBody))
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "request_too_large", "callback body is too large")
		return
	}
	taskID, err := kie.CallbackTaskID(body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "callback has no task id")
		return
	}
	if key := a.deps.WebhookHMACKey; key != "" {
		err := kie.VerifyCallback(key, taskID, r.Header.Get("X-Webhook-Timestamp"), r.Header.Get("X-Webhook-Signature"), time.Now())
		if err != nil {
			slog.Warn("callback rejected", "reason", err.Error())
			writeError(w, http.StatusUnauthorized, "unauthorized", "invalid callback signature")
			return
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()
	a.deps.Reconciler.Reconcile(ctx, taskID)
	w.WriteHeader(http.StatusOK)
}
