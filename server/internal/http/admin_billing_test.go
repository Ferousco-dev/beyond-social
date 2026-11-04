package httpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
)

type fakeAdminReader struct {
	price int
	days  int
}

func (f *fakeAdminReader) Overview(_ context.Context, price int) (billing.Overview, error) {
	f.price = price
	return billing.Overview{ActiveSubscribers: 3, MonthlyRecurringCents: 3 * price, Subscribers: []billing.Subscriber{{Email: "pro@example.com", Status: "active"}}}, nil
}

func (f *fakeAdminReader) RevenueHistory(_ context.Context, days int) ([]billing.RevenuePoint, error) {
	f.days = days
	return []billing.RevenuePoint{{Date: "2026-10-16", Currency: "usd", PackCents: 500}}, nil
}

type memEmail struct{ values map[string]string }

func (m *memEmail) Get(_ context.Context, key string) (string, bool, error) {
	v, ok := m.values[key]
	return v, ok, nil
}
func (m *memEmail) Set(_ context.Context, key, value, _ string) error {
	m.values[key] = value
	return nil
}

func TestAdminBillingOverviewAndEmailFrom(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	reader, settings := &fakeAdminReader{}, &memEmail{values: map[string]string{}}
	h.deps.BillingAdmin, h.deps.EmailSettings, h.deps.RevenueHistory = reader, settings, reader
	h.rebuild()
	h.profiles.rows[bob] = accounts.Profile{ID: bob, Role: accounts.RoleAdmin}
	user, admin := h.token(t, alice), h.token(t, bob)

	if res := send(h, http.MethodGet, "/api/v1/admin/billing", user, ""); res.Code != http.StatusNotFound {
		t.Fatalf("a normal user reached it: %d", res.Code)
	}
	if res := send(h, http.MethodGet, "/api/v1/admin/billing", admin, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "pro@example.com") || reader.price != 2000 {
		t.Fatalf("overview: %d %s price=%d", res.Code, res.Body, reader.price)
	}
	if res := send(h, http.MethodGet, "/api/v1/admin/billing/history?days=7", admin, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"packCents":500`) || reader.days != 7 {
		t.Fatalf("revenue history: %d %s days=%d", res.Code, res.Body, reader.days)
	}
	if res := send(h, http.MethodGet, "/api/v1/admin/billing/history?days=7", user, ""); res.Code != http.StatusNotFound {
		t.Fatalf("non-admin reached revenue history: %d", res.Code)
	}
	if res := send(h, http.MethodGet, "/api/v1/admin/billing/history?days=6", admin, ""); res.Code != http.StatusBadRequest {
		t.Fatalf("invalid history period: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodGet, "/api/v1/admin/email", admin, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "onboarding@resend.dev") {
		t.Fatalf("default from: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPut, "/api/v1/admin/email", admin, `{"from":"Beyond Social <hello@example.com>"}`); res.Code != http.StatusNoContent || settings.values[EmailFromKey] != "Beyond Social <hello@example.com>" {
		t.Fatalf("set: %d %v", res.Code, settings.values)
	}
	for name, bad := range map[string]string{"empty": `{"from":""}`, "no address": `{"from":"Beyond Social"}`, "header injection": `{"from":"a@b.c\nBcc: x@y.z"}`} {
		if res := send(h, http.MethodPut, "/api/v1/admin/email", admin, bad); res.Code != http.StatusBadRequest {
			t.Errorf("%s: %d", name, res.Code)
		}
	}
}
