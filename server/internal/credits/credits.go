// Package credits charges users for provider work. Every change is an
// idempotent ledger entry, so a retried request or repeated callback can never
// charge or refund twice.
package credits

import (
	"context"
	"errors"
	"fmt"
	"time"
)

type Kind string

const (
	KindGrant    Kind = "grant"
	KindPurchase Kind = "purchase"
	KindReserve  Kind = "reserve"
	KindSettle   Kind = "settle"
	KindRefund   Kind = "refund"
	KindAdjust   Kind = "adjust"
)

var (
	ErrInsufficient = errors.New("not enough credits")
	// ErrUnavailable means the action has no price or an admin turned it off.
	ErrUnavailable = errors.New("this action is not available")
	// ErrDailyLimit is the brake on runaway spend, set by an admin.
	ErrDailyLimit = errors.New("daily credit limit reached")
)

// Entry is one ledger row. Amount is signed: negative takes credits.
type Entry struct {
	UserID string
	Kind   Kind
	Amount int
	JobID  string
	// Key makes the entry idempotent: a second entry with the same key is a no-op.
	Key    string
	Reason string
	// Actor is the admin responsible for an adjustment, empty for system entries.
	Actor string
}

type Price struct {
	Action  string
	Credits int
	Enabled bool
}

type Store interface {
	// Apply records the entry and moves the balance in one transaction. It
	// returns applied=false, with no change, when the key was already used, and
	// ErrInsufficient when a negative amount would overdraw the balance.
	Apply(ctx context.Context, e Entry) (balance int, applied bool, err error)
	Balance(ctx context.Context, userID string) (int, error)
	// Reserved is the amount taken for a job, or 0 if none was.
	Reserved(ctx context.Context, jobID string) (int, error)
	Price(ctx context.Context, action string) (Price, bool, error)
	// SpentSince is the net credits a user has paid since a time, after refunds.
	SpentSince(ctx context.Context, userID string, since time.Time) (int, error)
	Setting(ctx context.Context, key string) (int, bool, error)
	// DailyUsage reads a user's spend since a time and the limit setting in one
	// round trip, since both are needed before every charge.
	DailyUsage(ctx context.Context, userID, limitKey string, since time.Time) (spent, limit int, hasLimit bool, err error)
}

// Setting keys an admin can change.
const (
	SettingSignupGrant    = "signup_grant"
	SettingDailyUserLimit = "daily_user_limit"
)

type Service struct {
	store Store
	// usage is set when plans are on.
	usage UsageStore
	// notify is told when a Pro member fills a window.
	notify LimitNotifier
}

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Balance(ctx context.Context, userID string) (int, error) {
	return s.store.Balance(ctx, userID)
}

// Quote returns the credits an action costs, or ErrUnavailable.
func (s *Service) Quote(ctx context.Context, action string) (int, error) {
	p, ok, err := s.store.Price(ctx, action)
	if err != nil {
		return 0, err
	}
	if !ok || !p.Enabled {
		return 0, fmt.Errorf("%w: %s", ErrUnavailable, action)
	}
	return p.Credits, nil
}

// Grant adds credits for a reason such as a sign-up bonus. key keeps it once.
func (s *Service) Grant(ctx context.Context, userID string, amount int, key, reason string) (bool, error) {
	_, applied, err := s.store.Apply(ctx, Entry{UserID: userID, Kind: KindGrant, Amount: amount, Key: key, Reason: reason})
	return applied, err
}

// Purchase adds credits a user paid for. key keeps one payment from granting twice.
func (s *Service) Purchase(ctx context.Context, userID string, amount int, key, reason string) (bool, error) {
	if amount <= 0 {
		return false, errors.New("credits: a purchase must add credits")
	}
	_, applied, err := s.store.Apply(ctx, Entry{UserID: userID, Kind: KindPurchase, Amount: amount, Key: key, Reason: reason})
	return applied, err
}

// Clawback takes back credits from a refunded payment. It never takes more than
// the user has left, so a refund cannot push a balance below zero, and it says
// how much it actually took.
func (s *Service) Clawback(ctx context.Context, userID string, amount int, key, reason string) (int, error) {
	balance, err := s.store.Balance(ctx, userID)
	if err != nil {
		return 0, err
	}
	take := min(amount, balance)
	if take <= 0 {
		return 0, nil
	}
	_, applied, err := s.store.Apply(ctx, Entry{UserID: userID, Kind: KindAdjust, Amount: -take, Key: key, Reason: reason})
	if err != nil || !applied {
		return 0, err
	}
	return take, nil
}

// Adjust is an admin correction, positive or negative, and needs a reason.
func (s *Service) Adjust(ctx context.Context, userID string, amount int, key, reason, actor string) (int, error) {
	if reason == "" || amount == 0 {
		return 0, errors.New("credits: an adjustment needs a non-zero amount and a reason")
	}
	balance, _, err := s.store.Apply(ctx, Entry{UserID: userID, Kind: KindAdjust, Amount: amount, Key: key, Reason: reason, Actor: actor})
	return balance, err
}

// Reserve takes credits before any provider is called.
func (s *Service) Reserve(ctx context.Context, userID, jobID string, amount int, reason string) error {
	if amount <= 0 {
		return nil
	}
	if s.usage == nil {
		return s.reserveCredits(ctx, userID, jobID, amount, reason, 100, false)
	}
	plan, err := s.usage.Plan(ctx, userID)
	if err != nil {
		return err
	}
	if plan == PlanPro {
		return s.reservePro(ctx, userID, jobID, amount, reason)
	}
	// Free users pay more for the same work, which is what makes upgrading worth it.
	pct := s.multiplierPct(ctx)
	return s.reserveCredits(ctx, userID, jobID, ceilPct(amount, pct), reason, pct, false)
}

// Settle keeps the charge for a finished job, handing back any part of the
// reservation that was not used. Settling and refunding share one key, so only
// the first of them ever takes effect.
func (s *Service) Settle(ctx context.Context, userID, jobID string, actual int) error {
	if s.usage != nil {
		ev, found, err := s.usage.Event(ctx, jobID)
		if err != nil {
			return err
		}
		if found && ev.Points > 0 {
			// Counted against a usage window: hand back what the work did not need.
			if back := ev.Points - max(actual, 0); back > 0 {
				return s.usage.Release(ctx, jobID, back)
			}
			return nil
		}
		if found && ev.MultPct > 0 {
			actual = ceilPct(actual, ev.MultPct)
		}
	}
	reserved, err := s.store.Reserved(ctx, jobID)
	if err != nil || reserved == 0 {
		return err
	}
	back := max(reserved-max(actual, 0), 0)
	_, _, err = s.store.Apply(ctx, Entry{
		UserID: userID, Kind: KindSettle, Amount: back, JobID: jobID, Key: "close:" + jobID, Reason: "job completed",
	})
	return err
}

// Keep closes a charge at its full price: work that delivered exactly what it reserved for.
func (s *Service) Keep(ctx context.Context, userID, jobID string) error {
	if s.usage != nil {
		if ev, found, err := s.usage.Event(ctx, jobID); err != nil || (found && ev.Points > 0) {
			return err // points stay counted in the windows; nothing is open in the ledger
		}
	}
	reserved, err := s.store.Reserved(ctx, jobID)
	if err != nil || reserved == 0 {
		return err
	}
	_, _, err = s.store.Apply(ctx, Entry{UserID: userID, Kind: KindSettle, Amount: 0, JobID: jobID, Key: "close:" + jobID, Reason: "completed"})
	return err
}

// Refund returns the whole reservation for a job that did not deliver.
func (s *Service) Refund(ctx context.Context, userID, jobID, reason string) error {
	if s.usage != nil {
		ev, found, err := s.usage.Event(ctx, jobID)
		if err != nil {
			return err
		}
		if found && ev.Points > 0 {
			return s.usage.Release(ctx, jobID, ev.Points)
		}
	}
	reserved, err := s.store.Reserved(ctx, jobID)
	if err != nil || reserved == 0 {
		return err
	}
	_, _, err = s.store.Apply(ctx, Entry{
		UserID: userID, Kind: KindRefund, Amount: reserved, JobID: jobID, Key: "close:" + jobID, Reason: reason,
	})
	return err
}

func (s *Service) checkDailyLimit(ctx context.Context, userID string, amount int) error {
	spent, limit, ok, err := s.store.DailyUsage(ctx, userID, SettingDailyUserLimit, time.Now().Add(-24*time.Hour))
	if err != nil || !ok || limit == 0 {
		return err
	}
	if spent+amount > limit {
		return ErrDailyLimit
	}
	return nil
}

// SignupGrant gives a new account its starting credits. It is safe to call
// again: the ledger key makes a second call a no-op.
func (s *Service) SignupGrant(ctx context.Context, userID string) error {
	amount, ok, err := s.store.Setting(ctx, SettingSignupGrant)
	if err != nil || !ok || amount == 0 {
		return err
	}
	_, err = s.Grant(ctx, userID, amount, "signup:"+userID, "welcome credits")
	return err
}
