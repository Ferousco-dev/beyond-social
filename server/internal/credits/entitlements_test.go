package credits

import (
	"context"
	"errors"
	"testing"
	"time"
)

type counts struct{ searches int }

func (c counts) Searches(context.Context, string, time.Time) (int, error) { return c.searches, nil }

func entitlements(plan Plan, c counts) *Entitlements {
	svc, m, _ := planService(plan)
	m.settings[SettingFreeSearchesDay], m.settings[SettingFreeSearchResults] = 3, 10
	return NewEntitlements(svc, c)
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
