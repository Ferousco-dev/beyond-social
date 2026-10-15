package billing

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// ErrAlreadyPro means the user already has an active membership.
var ErrAlreadyPro = errors.New("billing: already subscribed")

const defaultProPriceCents = 2000

// Subscribe starts a Pro membership and returns the Stripe page to pay on.
func (s *Service) Subscribe(ctx context.Context, userID, email string) (string, error) {
	if s.gateway == nil {
		return "", ErrUnavailable
	}
	existing, err := s.store.SubscriptionOf(ctx, userID)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return "", err
	}
	if existing.Status == "active" || existing.Status == "trialing" {
		return "", ErrAlreadyPro
	}
	price := defaultProPriceCents
	if s.prices != nil {
		if p := s.prices.ProPriceCents(ctx); p > 0 {
			price = p
		}
	}
	_, url, err := s.gateway.CreateSubscription(ctx, SubscribeInput{
		UserID: userID, Email: email, Customer: existing.StripeCustomer, PriceCents: price, Currency: "usd",
		SuccessURL: s.appURL + "/welcome?purchase=pro", CancelURL: s.appURL + "/pricing", Tax: s.taxOn(ctx),
	})
	if provider.Code(err) == provider.CodeNotConfigured {
		return "", ErrUnavailable
	}
	return url, err
}

// Portal opens Stripe's page for changing a card or cancelling.
func (s *Service) Portal(ctx context.Context, userID string) (string, error) {
	if s.gateway == nil {
		return "", ErrUnavailable
	}
	sub, err := s.store.SubscriptionOf(ctx, userID)
	if err != nil {
		return "", err
	}
	if sub.StripeCustomer == "" {
		return "", ErrNotFound
	}
	url, err := s.gateway.CreatePortal(ctx, sub.StripeCustomer, s.appURL+"/dashboard/usage")
	if provider.Code(err) == provider.CodeNotConfigured {
		return "", ErrUnavailable
	}
	return url, err
}

// stripeStatus maps Stripe's subscription states to ours.
func stripeStatus(status string) string {
	switch status {
	case "active", "trialing", "past_due", "incomplete":
		return status
	case "unpaid":
		return "past_due"
	}
	return "canceled"
}

type subscriptionObject struct {
	ID               string `json:"id"`
	Customer         string `json:"customer"`
	Status           string `json:"status"`
	CurrentPeriodEnd int64  `json:"current_period_end"`
	Metadata         struct {
		UserID string `json:"user_id"`
	} `json:"metadata"`
	Items struct {
		Data []struct {
			CurrentPeriodEnd int64 `json:"current_period_end"`
		} `json:"data"`
	} `json:"items"`
}

// periodEnd reads the end of the paid period. Newer Stripe versions keep it on the item.
func (o subscriptionObject) periodEnd() *time.Time {
	end := o.CurrentPeriodEnd
	if end == 0 && len(o.Items.Data) > 0 {
		end = o.Items.Data[0].CurrentPeriodEnd
	}
	if end == 0 {
		return nil
	}
	t := time.Unix(end, 0).UTC()
	return &t
}

// subscriptionChanged records what Stripe says about a membership.
func (s *Service) subscriptionChanged(ctx context.Context, o subscriptionObject) error {
	userID := o.Metadata.UserID
	if userID == "" {
		found, err := s.store.UserOfSubscription(ctx, o.ID)
		if err != nil {
			return err
		}
		userID = found
	}
	if o.ID == "" || userID == "" {
		return fmt.Errorf("%w: a subscription with no owner", ErrNotFound)
	}
	previous, _ := s.store.SubscriptionOf(ctx, userID)
	status := stripeStatus(o.Status)
	if err := s.store.SaveSubscription(ctx, Subscription{
		UserID: userID, Status: status, StripeCustomer: o.Customer, StripeSubscription: o.ID, PeriodEnd: o.periodEnd(),
	}); err != nil {
		return err
	}
	if s.notify != nil && status != previous.Status {
		switch {
		case status == "past_due":
			s.notify.PaymentFailed(userID)
		case status == "canceled" && (previous.Status == "active" || previous.Status == "trialing" || previous.Status == "past_due"):
			s.notify.ProEnded(userID)
		}
	}
	return nil
}

// subscriptionStarted records a finished subscription checkout, so Pro starts
// before Stripe's separate subscription message arrives.
func (s *Service) subscriptionStarted(ctx context.Context, userID, customer, subscriptionID string) error {
	if userID == "" || subscriptionID == "" {
		return fmt.Errorf("%w: a subscription checkout with no owner", ErrNotFound)
	}
	previous, _ := s.store.SubscriptionOf(ctx, userID)
	if err := s.store.SaveSubscription(ctx, Subscription{UserID: userID, Status: "active", StripeCustomer: customer, StripeSubscription: subscriptionID}); err != nil {
		return err
	}
	if s.notify != nil && previous.Status != "active" && previous.Status != "trialing" {
		s.notify.ProStarted(userID)
	}
	return nil
}

type invoiceObject struct {
	ID         string `json:"id"`
	Customer   string `json:"customer"`
	AmountPaid int    `json:"amount_paid"`
	Currency   string `json:"currency"`
}

// invoicePaid records a paid subscription invoice for the revenue view.
func (s *Service) invoicePaid(ctx context.Context, o invoiceObject) error {
	if o.ID == "" || o.Customer == "" || o.AmountPaid <= 0 {
		return nil
	}
	userID, err := s.store.UserOfCustomer(ctx, o.Customer)
	if err != nil {
		return err
	}
	return s.store.SaveInvoice(ctx, Invoice{ID: o.ID, UserID: userID, AmountCents: o.AmountPaid, Currency: o.Currency})
}
