package httpserver

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
)

const maxHeygenCallbackBody = 64 << 10

// VideoReconciler re-reads a HeyGen video and updates its job.
type VideoReconciler interface {
	Reconcile(ctx context.Context, videoID string)
}

// heygenCallback handles HeyGen's video completion webhook. The payload is
// never trusted: it only names a video, whose real state is fetched from
// HeyGen's API with our own key. When a signing secret is configured the
// signature (hex HMAC-SHA256 of the raw body, `signature` header) must verify.
// HeyGen retries identical payloads, which is harmless because reconciling is
// idempotent and a finished job ignores further updates.
func (a *App) heygenCallback(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxHeygenCallbackBody))
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "request_too_large", "callback body is too large")
		return
	}
	if secret := webhookSecret(r.Context(), a.deps.HeygenWebhookSecret); secret != "" {
		if err := heygen.VerifyWebhook(secret, body, r.Header.Get("signature")); err != nil {
			slog.Warn("heygen callback rejected", "reason", err.Error())
			writeError(w, http.StatusUnauthorized, "unauthorized", "invalid callback signature")
			return
		}
	}
	ref, err := heygen.ParseWebhook(body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "callback has no video reference")
		return
	}
	if ref.VideoID != "" {
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()
		a.deps.VideoReconciler.Reconcile(ctx, ref.VideoID)
	}
	w.WriteHeader(http.StatusOK)
}
