package credits

import (
	"context"
	"errors"
	"testing"
	"time"
)

type counts struct{ avatars, searches int }

func (c counts) Avatars(context.Context, string) (int, error)             { return c.avatars, nil }
func (c counts) Searches(context.Context, string, time.Time) (int, error) { return c.searches, nil }

func entitlements(plan Plan, c counts) *Entitlements {
	svc, m, _ := planService(plan)
	m.settings[SettingFreeAvatars], m.settings[SettingFreeSearchesDay], m.settings[SettingFreeSearchResults] = 1, 3, 10
	return NewEntitlements(svc, c)
}

func TestFreeUsersGetOneAvatar(t *testing.T) {
	ctx := context.Background()
	if err := entitlements(PlanFree, counts{avatars: 0}).CheckAvatar(ctx, "u1"); err != nil {
		t.Fatalf("the first avatar: %v", err)
	}
	err := entitlements(PlanFree, counts{avatars: 1}).CheckAvatar(ctx, "u1")
	var up *UpgradeError
	if !errors.Is(err, ErrUpgradeRequired) || !errors.As(err, &up) || up.Reason == "" {
		t.Fatalf("a second avatar: %v", err)
	}
	if err := entitlements(PlanPro, counts{avatars: 9}).CheckAvatar(ctx, "u1"); err != nil {
		t.Fatalf("Pro is not limited: %v", err)
	}
}

func TestFreeSearchesAreThreeADayWithTenResults(t *testing.T) {
	ctx := context.Background()
	if capped, err := entitlements(PlanFree, counts{searches: 2}).SearchAllowance(ctx, "u1"); err != nil || capped != 10 {
		t.Fatalf("the third search: cap %d err %v", capped, err)
	}
	if _, err := entitlements(PlanFree, counts{searches: 3}).SearchAllowance(ctx, "u1"); !errors.Is(err, ErrUpgradeRequired) {
		t.Fatalf("the fourth search: %v", err)
	}
	if capped, err := entitlements(PlanPro, counts{searches: 50}).SearchAllowance(ctx, "u1"); err != nil || capped != 0 {
		t.Fatalf("Pro: cap %d err %v", capped, err)
	}
}
