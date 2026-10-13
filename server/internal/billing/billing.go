// Package billing sells credit packs through Stripe Checkout. The server never
// sees a card: Stripe hosts the payment page and tells us, with a signed message,
// when it has been paid or refunded.
package billing

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

var (
	ErrNotFound    = errors.New("billing: not found")
	ErrInvalid     = errors.New("billing: invalid")
	ErrUnavailable = errors.New("billing: payments are not available")
)

const maxPackCredits = 1_000_000

type Pack struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Credits    int    `json:"credits"`
	PriceCents int    `json:"price_cents"`
	Currency   string `json:"currency"`
	Enabled    bool   `json:"enabled"`
	Sort       int    `json:"sort"`
}

// Validate checks what an admin typed before it is stored or sold.
func (p Pack) Validate() error {
	switch {
	case strings.TrimSpace(p.Name) == "" || len([]rune(p.Name)) > 60:
		return fmt.Errorf("%w: the name must be 1 to 60 characters", ErrInvalid)
	case p.Credits <= 0 || p.Credits > maxPackCredits:
		return fmt.Errorf("%w: credits must be between 1 and %d", ErrInvalid, maxPackCredits)
	case p.PriceCents < 50 || p.PriceCents > 10_000_000:
		return fmt.Errorf("%w: the price must be at least 50 cents", ErrInvalid)
	case len(p.Currency) != 3 || strings.ToLower(p.Currency) != p.Currency:
		return fmt.Errorf("%w: use a three letter lowercase currency such as usd", ErrInvalid)
	}
	return nil
}

type Payment struct {
	ID             string     `json:"id"`
	UserID         string     `json:"-"`
	PackName       string     `json:"pack_name"`
	Credits        int        `json:"credits"`
	AmountCents    int        `json:"amount_cents"`
	Currency       string     `json:"currency"`
	Status         string     `json:"status"`
	CreditsRemoved int        `json:"credits_removed"`
	CreatedAt      time.Time  `json:"created_at"`
	PaidAt         *time.Time `json:"paid_at,omitempty"`
}

type Store interface {
	Packs(ctx context.Context, enabledOnly bool) ([]Pack, error)
	Pack(ctx context.Context, id string) (Pack, error)
	SavePack(ctx context.Context, p Pack, actor string) (Pack, error)
	DeletePack(ctx context.Context, id string) error

	CreatePayment(ctx context.Context, userID string, p Pack) (Payment, error)
	AttachSession(ctx context.Context, paymentID, sessionID string) error
	PaymentBySession(ctx context.Context, sessionID string) (Payment, error)
	PaymentByIntent(ctx context.Context, intent string) (Payment, error)
	// MarkPaid records the payment and its payment intent. It is safe to repeat.
	MarkPaid(ctx context.Context, paymentID, intent string) error
	// AddRemoved records credits taken back, and marks the payment refunded when all of it was.
	AddRemoved(ctx context.Context, paymentID string, credits int, fullyRefunded bool) error
	UserPayments(ctx context.Context, userID string, limit int) ([]Payment, error)

	SaveSubscription(ctx context.Context, s Subscription) error
	SubscriptionOf(ctx context.Context, userID string) (Subscription, error)
	UserOfSubscription(ctx context.Context, stripeSubscription string) (string, error)
	UserOfCustomer(ctx context.Context, stripeCustomer string) (string, error)
	SaveInvoice(ctx context.Context, inv Invoice) error
}

// Invoice is one paid subscription invoice.
type Invoice struct {
	ID          string
	UserID      string
	AmountCents int
	Currency    string
}

// Notifier sends the emails billing events call for. It must not block or fail.
type Notifier interface {
	PackBought(userID, pack string, credits, cents int, currency string)
	ProStarted(userID string)
	PaymentFailed(userID string)
	ProEnded(userID string)
}

// Subscription is a user's Pro membership as Stripe last reported it.
type Subscription struct {
	UserID             string
	Status             string
	StripeCustomer     string
	StripeSubscription string
	PeriodEnd          *time.Time
}

// Credits is the part of the credit system billing uses.
type Credits interface {
	Purchase(ctx context.Context, userID string, amount int, key, reason string) (bool, error)
	Clawback(ctx context.Context, userID string, amount int, key, reason string) (int, error)
}

type CheckoutInput struct {
	PaymentID, UserID, Email, PackName string
	Credits, AmountCents               int
	Currency, SuccessURL, CancelURL    string
	// Tax has Stripe add sales tax at checkout.
	Tax bool
}

type SubscribeInput struct {
	UserID, Email, Customer         string
	PriceCents                      int
	Currency, SuccessURL, CancelURL string
	Tax                             bool
}

type Gateway interface {
	CreateCheckout(ctx context.Context, in CheckoutInput) (sessionID, url string, err error)
	CreateSubscription(ctx context.Context, in SubscribeInput) (sessionID, url string, err error)
	CreatePortal(ctx context.Context, customer, returnURL string) (url string, err error)
}

// Prices reads what Pro costs, which an admin can change.
type Prices interface {
	ProPriceCents(ctx context.Context) int
}

type Service struct {
	store      Store
	credits    Credits
	gateway    Gateway
	prices     Prices
	notify     Notifier
	tax        func(ctx context.Context) bool
	appURL     string
	successURL string
	cancelURL  string
}

// WithNotifier turns on billing emails.
func (s *Service) WithNotifier(n Notifier) *Service {
	s.notify = n
	return s
}

// WithTax asks Stripe to work out and collect sales tax while the setting is on.
func (s *Service) WithTax(enabled func(ctx context.Context) bool) *Service {
	s.tax = enabled
	return s
}

func (s *Service) taxOn(ctx context.Context) bool { return s.tax != nil && s.tax(ctx) }

// WithPrices lets the Pro price come from admin settings.
func (s *Service) WithPrices(p Prices) *Service {
	s.prices = p
	return s
}

func NewService(store Store, credits Credits, gateway Gateway, appURL string) *Service {
	base := strings.TrimRight(appURL, "/")
	return &Service{store: store, credits: credits, gateway: gateway, appURL: base, successURL: base + "/dashboard/credits?paid=1", cancelURL: base + "/dashboard/credits?cancelled=1"}
}

func (s *Service) Packs(ctx context.Context, enabledOnly bool) ([]Pack, error) {
	return s.store.Packs(ctx, enabledOnly)
}

func (s *Service) SavePack(ctx context.Context, p Pack, actor string) (Pack, error) {
	p.Name, p.Currency = strings.TrimSpace(p.Name), strings.ToLower(strings.TrimSpace(p.Currency))
	if p.Currency == "" {
		p.Currency = "usd"
	}
	if err := p.Validate(); err != nil {
		return Pack{}, err
	}
	return s.store.SavePack(ctx, p, actor)
}

func (s *Service) DeletePack(ctx context.Context, id string) error {
	return s.store.DeletePack(ctx, id)
}

func (s *Service) Payments(ctx context.Context, userID string) ([]Payment, error) {
	return s.store.UserPayments(ctx, userID, 50)
}

// Checkout starts a payment for a pack and returns the Stripe page to send the user to.
func (s *Service) Checkout(ctx context.Context, userID, email, packID string) (string, error) {
	if s.gateway == nil {
		return "", ErrUnavailable
	}
	pack, err := s.store.Pack(ctx, packID)
	if err != nil {
		return "", err
	}
	if !pack.Enabled {
		return "", ErrNotFound
	}
	payment, err := s.store.CreatePayment(ctx, userID, pack)
	if err != nil {
		return "", err
	}
	sessionID, url, err := s.gateway.CreateCheckout(ctx, CheckoutInput{
		PaymentID: payment.ID, UserID: userID, Email: email, PackName: pack.Name, Credits: pack.Credits,
		AmountCents: pack.PriceCents, Currency: pack.Currency, SuccessURL: s.successURL, CancelURL: s.cancelURL, Tax: s.taxOn(ctx),
	})
	if provider.Code(err) == provider.CodeNotConfigured {
		// The admin has not pasted the Stripe key in yet.
		return "", ErrUnavailable
	}
	if err != nil {
		return "", err
	}
	if err := s.store.AttachSession(ctx, payment.ID, sessionID); err != nil {
		return "", err
	}
	return url, nil
}

// Paid credits a payment once Stripe says it succeeded. Any number of repeats
// of the same message add the credits only once.
func (s *Service) Paid(ctx context.Context, sessionID, intent string) error {
	payment, err := s.store.PaymentBySession(ctx, sessionID)
	if err != nil {
		return err
	}
	applied, err := s.credits.Purchase(ctx, payment.UserID, payment.Credits, "purchase:"+payment.ID, "bought "+payment.PackName)
	if err != nil {
		return err
	}
	if err := s.store.MarkPaid(ctx, payment.ID, intent); err != nil {
		return err
	}
	// Thanks are sent once, for the message that actually added the credits.
	if applied && s.notify != nil {
		s.notify.PackBought(payment.UserID, payment.PackName, payment.Credits, payment.AmountCents, payment.Currency)
	}
	return nil
}

// Refunded takes back the share of a payment's credits that matches the share of
// money returned. It never takes more than the user has left, and says when it
// could not take everything.
func (s *Service) Refunded(ctx context.Context, intent string, amount, refunded int) error {
	if amount <= 0 || refunded <= 0 {
		return nil
	}
	payment, err := s.store.PaymentByIntent(ctx, intent)
	if err != nil {
		return err
	}
	refunded = min(refunded, amount)
	want := payment.Credits*refunded/amount - payment.CreditsRemoved
	full := refunded == amount
	if want <= 0 {
		return s.store.AddRemoved(ctx, payment.ID, 0, full)
	}
	took, err := s.credits.Clawback(ctx, payment.UserID, want, fmt.Sprintf("refund:%s:%d", payment.ID, refunded), "payment refunded")
	if err != nil {
		return err
	}
	if took < want {
		slog.Warn("a refund could not take back all its credits: they were already spent", "payment", payment.ID, "wanted", want, "took", took)
	}
	return s.store.AddRemoved(ctx, payment.ID, took, full)
}
