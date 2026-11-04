package httpserver

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/google/uuid"
)

// BillingService is what the credit pack endpoints need.
type BillingService interface {
	Packs(ctx context.Context, enabledOnly bool) ([]billing.Pack, error)
	SavePack(ctx context.Context, p billing.Pack, actor string) (billing.Pack, error)
	DeletePack(ctx context.Context, id string) error
	Payments(ctx context.Context, userID string) ([]billing.Payment, error)
	Checkout(ctx context.Context, userID, email, packID string) (string, error)
	Handle(ctx context.Context, payload []byte) error
	Subscribe(ctx context.Context, userID, email string) (string, error)
	Portal(ctx context.Context, userID string) (string, error)
}

const maxStripeBody = 256 << 10

// listPacks is public: the pricing page shows what is for sale before anyone signs in.
func (a *App) listPacks(w http.ResponseWriter, r *http.Request) {
	packs, err := a.deps.Billing.Packs(r.Context(), true)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, packs)
}

func (a *App) myPayments(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	payments, err := a.deps.Billing.Payments(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, payments)
}

func (a *App) checkout(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var req struct {
		PackID string `json:"pack_id"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if _, err := uuid.Parse(req.PackID); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "pack_id must be a UUID")
		return
	}
	profile, err := a.deps.Accounts.Active(r.Context(), identity.UserID, identity.Email, identity.Name)
	if err != nil {
		a.accountError(w, r, err)
		return
	}
	// Credit packs are how a Pro member keeps going past a limit. Free members upgrade instead.
	plan, err := a.deps.Usage.PlanOf(r.Context(), identity.UserID)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if plan != credits.PlanPro {
		writeError(w, http.StatusForbidden, "upgrade_required", "credit packs are for Pro members. Upgrade to Pro to buy more credits")
		return
	}
	url, err := a.deps.Billing.Checkout(r.Context(), identity.UserID, profile.Email, req.PackID)
	switch {
	case errors.Is(err, billing.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "that pack is not for sale")
	case errors.Is(err, billing.ErrUnavailable):
		writeError(w, http.StatusServiceUnavailable, "unavailable", "payments are not available right now")
	case err != nil:
		slog.Error("start checkout", "error", err)
		writeError(w, http.StatusBadGateway, "provider_failed", "could not start the payment; you were not charged")
	default:
		writeData(w, http.StatusOK, map[string]string{"url": url})
	}
}

// stripeCallback receives Stripe's signed messages. The body is read raw because
// the signature covers its exact bytes.
func (a *App) stripeCallback(w http.ResponseWriter, r *http.Request) {
	payload, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxStripeBody))
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "request_too_large", "callback body is too large")
		return
	}
	secret := webhookSecret(r.Context(), a.deps.StripeWebhookSecret)
	if err := billing.VerifySignature(payload, r.Header.Get("Stripe-Signature"), secret, time.Now()); err != nil {
		slog.Warn("stripe callback rejected", "reason", err.Error())
		writeError(w, http.StatusUnauthorized, "unauthorized", "invalid signature")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	switch err := a.deps.Billing.Handle(ctx, payload); {
	case errors.Is(err, billing.ErrNotFound):
		// A payment this app never started (another product on the same Stripe account). Nothing to do, and a retry would not help.
		slog.Info("stripe event for an unknown payment ignored")
	case err != nil:
		// A failure here is ours, so Stripe is asked to try again later.
		slog.Error("handle stripe event", "error", err)
		writeError(w, http.StatusInternalServerError, "internal", "could not process the event")
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (a *App) adminPacks(w http.ResponseWriter, r *http.Request) {
	packs, err := a.deps.Billing.Packs(r.Context(), false)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, packs)
}

func (a *App) savePack(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	var pack billing.Pack
	if !decodeAdminBody(w, r, &pack) {
		return
	}
	// The id comes from the address, never from the body.
	pack.ID = r.PathValue("id")
	if pack.ID != "" {
		if _, err := uuid.Parse(pack.ID); err != nil {
			writeError(w, http.StatusNotFound, "not_found", "pack not found")
			return
		}
	}
	saved, err := a.deps.Billing.SavePack(r.Context(), pack, identity.UserID)
	switch {
	case errors.Is(err, billing.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, billing.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "pack not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		a.audit(r, identity.UserID, "pack.save", saved.ID, map[string]any{"credits": saved.Credits, "price_cents": saved.PriceCents, "enabled": saved.Enabled})
		writeData(w, http.StatusOK, saved)
	}
}

func (a *App) deletePack(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	id := r.PathValue("id")
	err := a.deps.Billing.DeletePack(r.Context(), id)
	switch {
	case errors.Is(err, billing.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "pack not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		a.audit(r, identity.UserID, "pack.delete", id, map[string]any{})
		w.WriteHeader(http.StatusNoContent)
	}
}

// plans is public: the pricing page shows what each plan allows before sign-in.
func (a *App) plans(w http.ResponseWriter, r *http.Request) {
	info, err := a.deps.Usage.Info(r.Context())
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	writeData(w, http.StatusOK, info)
}

func (a *App) subscribe(w http.ResponseWriter, r *http.Request) {
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
	url, err := a.deps.Billing.Subscribe(r.Context(), identity.UserID, profile.Email)
	a.sendToStripe(w, r, url, err)
}

func (a *App) billingPortal(w http.ResponseWriter, r *http.Request) {
	identity, ok := auth.IdentityFromContext(r.Context())
	if !ok {
		writeUnauthorized(w)
		return
	}
	url, err := a.deps.Billing.Portal(r.Context(), identity.UserID)
	a.sendToStripe(w, r, url, err)
}

// sendToStripe answers with the page to go to, or says why there is none.
func (a *App) sendToStripe(w http.ResponseWriter, r *http.Request, url string, err error) {
	switch {
	case errors.Is(err, billing.ErrAlreadyPro):
		writeError(w, http.StatusConflict, "already_subscribed", "you already have Pro")
	case errors.Is(err, billing.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "there is no membership to manage")
	case errors.Is(err, billing.ErrUnavailable):
		writeError(w, http.StatusServiceUnavailable, "unavailable", "payments are not available right now")
	case err != nil:
		slog.Error("open stripe page", "error", err)
		writeError(w, http.StatusBadGateway, "provider_failed", "could not open the payment page; you were not charged")
	default:
		writeData(w, http.StatusOK, map[string]string{"url": url})
	}
}
