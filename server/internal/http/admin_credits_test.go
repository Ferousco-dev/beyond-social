package httpserver

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/Ferousco-dev/beyond-social/server/internal/secrets"
)

type fakeCreditAdmin struct{ patched string }

func (f *fakeCreditAdmin) Prices(context.Context) ([]credits.PriceRow, error) {
	return []credits.PriceRow{{Action: "discovery_search", Credits: 5, Enabled: true}}, nil
}
func (f *fakeCreditAdmin) UpdatePrice(_ context.Context, action string, _ credits.PricePatch, _ string) (credits.PriceRow, error) {
	if action != "discovery_search" {
		return credits.PriceRow{}, credits.ErrUnavailable
	}
	f.patched = action
	return credits.PriceRow{Action: action, Credits: 9}, nil
}
func (f *fakeCreditAdmin) Settings(context.Context) ([]credits.Setting, error) { return nil, nil }
func (f *fakeCreditAdmin) SetSetting(_ context.Context, key string, _ int, _ string) error {
	if key != "signup_grant" {
		return credits.ErrInvalid
	}
	return nil
}
func (f *fakeCreditAdmin) SegmentCounts(context.Context) (credits.SegmentCounts, error) {
	return credits.SegmentCounts{Total: 3, New: 1}, nil
}
func (f *fakeCreditAdmin) FindUsers(context.Context, string, credits.Segment, int) ([]credits.UserCredits, error) {
	return []credits.UserCredits{{ID: alice, Email: "a@x.co", Balance: 7}}, nil
}
func (f *fakeCreditAdmin) Ledger(context.Context, string, int) ([]credits.LedgerRow, error) {
	return []credits.LedgerRow{{Kind: credits.KindGrant, Amount: 25}}, nil
}
func (f *fakeCreditAdmin) Usage(context.Context, int) (credits.UsageReport, error) {
	return credits.UsageReport{}, nil
}

type fakeLedger struct{}

func (fakeLedger) Adjust(_ context.Context, _ string, amount int, _, reason, _ string) (int, error) {
	if amount < -10 {
		return 0, credits.ErrInsufficient
	}
	if reason == "" {
		return 0, errors.New("reason required")
	}
	return 10 + amount, nil
}

type fakeBalance struct{}

func (fakeBalance) Balance(context.Context, string) (int, error) { return 42, nil }

type fakeProbe struct{}

func (fakeProbe) Verify(_ context.Context, _, value string) error {
	if value == "bad" {
		return errors.New("the provider rejected this key")
	}
	return nil
}

type fakeVault struct{ set string }

func (v *fakeVault) Statuses(context.Context) ([]secrets.Status, error) { return nil, nil }
func (v *fakeVault) Set(_ context.Context, _, value, _ string) error    { v.set = value; return nil }
func (v *fakeVault) Clear(context.Context, string) error                { return nil }
func (v *fakeVault) Writable() bool                                     { return true }

func send(h *harness, method, path, token, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.handler.ServeHTTP(w, req)
	return w
}

func TestAdminCreditsAndMyBalance(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	admin := &fakeCreditAdmin{}
	vault := &fakeVault{}
	h.deps.CreditAdmin, h.deps.CreditLedger, h.deps.Credits = admin, fakeLedger{}, fakeBalance{}
	h.deps.Vault, h.deps.Probe = vault, fakeProbe{}
	h.rebuild()
	h.profiles.rows[bob] = accounts.Profile{ID: bob, Role: accounts.RoleAdmin}
	user, adm := h.token(t, alice), h.token(t, bob)

	if res := send(h, http.MethodGet, "/api/v1/admin/credits/prices", user, ""); res.Code != http.StatusNotFound {
		t.Fatalf("a normal user must not reach admin credits: %d", res.Code)
	}
	if res := send(h, http.MethodPut, "/api/v1/admin/credits/prices/discovery_search", adm, `{"margin":2}`); res.Code != http.StatusOK || admin.patched == "" {
		t.Fatalf("price update: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPut, "/api/v1/admin/credits/prices/nope", adm, `{}`); res.Code != http.StatusNotFound {
		t.Fatalf("unknown price: %d", res.Code)
	}
	if res := send(h, http.MethodPut, "/api/v1/admin/credits/settings/bogus", adm, `{"value":1}`); res.Code != http.StatusBadRequest {
		t.Fatalf("unknown setting: %d", res.Code)
	}
	if res := send(h, http.MethodPut, "/api/v1/admin/credits/prices/discovery_search", adm, `{"surprise":1}`); res.Code != http.StatusBadRequest {
		t.Fatalf("unknown field must be refused: %d", res.Code)
	}

	adjust := "/api/v1/admin/users/" + alice + "/credits"
	if res := send(h, http.MethodPost, adjust, adm, `{"amount":5,"reason":"goodwill"}`); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"balance":15`) {
		t.Fatalf("adjust: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, adjust, adm, `{"amount":-50,"reason":"clawback"}`); res.Code != http.StatusConflict {
		t.Fatalf("overdraw: %d", res.Code)
	}
	if res := send(h, http.MethodPost, adjust, adm, `{"amount":5}`); res.Code != http.StatusBadRequest {
		t.Fatalf("missing reason: %d", res.Code)
	}

	res := send(h, http.MethodGet, "/api/v1/credits", user, "")
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"balance":42`) || !strings.Contains(res.Body.String(), `"grant"`) {
		t.Fatalf("my credits: %d %s", res.Code, res.Body)
	}

	if res := send(h, http.MethodPut, "/api/v1/admin/providers/kie", adm, `{"value":"bad"}`); res.Code != http.StatusUnprocessableEntity || vault.set != "" {
		t.Fatalf("a rejected key must not be stored: %d set=%q", res.Code, vault.set)
	}
	if res := send(h, http.MethodPut, "/api/v1/admin/providers/kie", adm, `{"value":"good"}`); res.Code != http.StatusNoContent || vault.set != "good" {
		t.Fatalf("good key: %d set=%q", res.Code, vault.set)
	}
}
