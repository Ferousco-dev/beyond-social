package billing

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Tolerance is how old a signed message may be. Stripe signs the time it sent it,
// so an old one that someone captured and replays is refused.
const Tolerance = 5 * time.Minute

var ErrBadSignature = errors.New("billing: the signature does not match")

// VerifySignature checks a Stripe-Signature header against the raw body.
func VerifySignature(payload []byte, header, secret string, now time.Time) error {
	if secret == "" {
		return ErrBadSignature
	}
	var stamp string
	var signatures []string
	for _, part := range strings.Split(header, ",") {
		k, v, ok := strings.Cut(strings.TrimSpace(part), "=")
		switch {
		case !ok:
		case k == "t":
			stamp = v
		case k == "v1":
			signatures = append(signatures, v)
		}
	}
	seconds, err := strconv.ParseInt(stamp, 10, 64)
	if err != nil || len(signatures) == 0 {
		return ErrBadSignature
	}
	if age := now.Sub(time.Unix(seconds, 0)); age > Tolerance || age < -Tolerance {
		return fmt.Errorf("%w: too old", ErrBadSignature)
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(stamp + "."))
	mac.Write(payload)
	want := mac.Sum(nil)
	for _, sig := range signatures {
		got, err := hex.DecodeString(sig)
		if err == nil && hmac.Equal(got, want) {
			return nil
		}
	}
	return ErrBadSignature
}

// Sign makes a header the way Stripe does. It exists for tests.
func Sign(payload []byte, secret string, at time.Time) string {
	stamp := strconv.FormatInt(at.Unix(), 10)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(stamp + "."))
	mac.Write(payload)
	return "t=" + stamp + ",v1=" + hex.EncodeToString(mac.Sum(nil))
}

type event struct {
	Type string `json:"type"`
	Data struct {
		Object json.RawMessage `json:"object"`
	} `json:"data"`
}

// Handle acts on one verified Stripe message. Types it does not know are ignored,
// so adding an event in the Stripe dashboard can never break anything.
func (s *Service) Handle(ctx context.Context, payload []byte) error {
	var e event
	if err := json.Unmarshal(payload, &e); err != nil {
		return fmt.Errorf("billing: unreadable event: %w", err)
	}
	switch e.Type {
	case "checkout.session.completed", "checkout.session.async_payment_succeeded":
		var o struct {
			ID            string `json:"id"`
			Mode          string `json:"mode"`
			PaymentStatus string `json:"payment_status"`
			PaymentIntent string `json:"payment_intent"`
			Customer      string `json:"customer"`
			Subscription  string `json:"subscription"`
			Reference     string `json:"client_reference_id"`
		}
		if err := json.Unmarshal(e.Data.Object, &o); err != nil {
			return fmt.Errorf("billing: unreadable session: %w", err)
		}
		// A delayed payment method completes unpaid first and succeeds later.
		if o.PaymentStatus != "paid" {
			return nil
		}
		if o.Mode == "subscription" {
			return s.subscriptionStarted(ctx, o.Reference, o.Customer, o.Subscription)
		}
		return s.Paid(ctx, o.ID, o.PaymentIntent)
	case "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted":
		var o subscriptionObject
		if err := json.Unmarshal(e.Data.Object, &o); err != nil {
			return fmt.Errorf("billing: unreadable subscription: %w", err)
		}
		if e.Type == "customer.subscription.deleted" {
			o.Status = "canceled"
		}
		return s.subscriptionChanged(ctx, o)
	case "invoice.paid":
		var o invoiceObject
		if err := json.Unmarshal(e.Data.Object, &o); err != nil {
			return fmt.Errorf("billing: unreadable invoice: %w", err)
		}
		return s.invoicePaid(ctx, o)
	case "charge.refunded":
		var o struct {
			PaymentIntent  string `json:"payment_intent"`
			Amount         int    `json:"amount"`
			AmountRefunded int    `json:"amount_refunded"`
		}
		if err := json.Unmarshal(e.Data.Object, &o); err != nil {
			return fmt.Errorf("billing: unreadable charge: %w", err)
		}
		return s.Refunded(ctx, o.PaymentIntent, o.Amount, o.AmountRefunded)
	}
	return nil
}
