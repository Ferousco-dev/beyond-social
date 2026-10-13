package credits

import (
	"context"
	"errors"
	"fmt"
	"time"
)

// ErrUpgradeRequired means a Free plan limit was reached and Pro lifts it.
var ErrUpgradeRequired = errors.New("upgrade required")

// UpgradeError says what was limited, in words a person can read.
type UpgradeError struct{ Reason string }

func (e *UpgradeError) Error() string { return "upgrade required: " + e.Reason }

func (e *UpgradeError) Is(target error) bool { return target == ErrUpgradeRequired }

// Counter counts what a Free user has already used.
type Counter interface {
	Avatars(ctx context.Context, userID string) (int, error)
	Searches(ctx context.Context, userID string, since time.Time) (int, error)
}

// Entitlements applies the Free plan's restrictions. Pro has none of them.
type Entitlements struct {
	svc     *Service
	counter Counter
}

func NewEntitlements(svc *Service, counter Counter) *Entitlements {
	return &Entitlements{svc: svc, counter: counter}
}

func (e *Entitlements) setting(ctx context.Context, key string, fallback int) int {
	if v, ok, err := e.svc.store.Setting(ctx, key); err == nil && ok {
		return v
	}
	return fallback
}

func (e *Entitlements) free(ctx context.Context, userID string) (bool, error) {
	plan, err := e.svc.PlanOf(ctx, userID)
	return plan != PlanPro, err
}

// CheckAvatar refuses a new avatar once a Free user has their one.
func (e *Entitlements) CheckAvatar(ctx context.Context, userID string) error {
	free, err := e.free(ctx, userID)
	if err != nil || !free {
		return err
	}
	limit := e.setting(ctx, SettingFreeAvatars, 1)
	have, err := e.counter.Avatars(ctx, userID)
	if err != nil {
		return err
	}
	if have >= limit {
		return &UpgradeError{Reason: fmt.Sprintf("The Free plan includes %d avatar. Upgrade to Pro to make more.", limit)}
	}
	return nil
}

// SearchAllowance says how many results a search may return, or refuses it when
// a Free user has had their searches for the day. Zero means no cap.
func (e *Entitlements) SearchAllowance(ctx context.Context, userID string) (int, error) {
	free, err := e.free(ctx, userID)
	if err != nil || !free {
		return 0, err
	}
	perDay := e.setting(ctx, SettingFreeSearchesDay, 3)
	now := time.Now().UTC()
	used, err := e.counter.Searches(ctx, userID, time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC))
	if err != nil {
		return 0, err
	}
	if used >= perDay {
		return 0, &UpgradeError{Reason: fmt.Sprintf("The Free plan includes %d searches a day. Upgrade to Pro for unlimited searching.", perDay)}
	}
	return e.setting(ctx, SettingFreeSearchResults, 10), nil
}
