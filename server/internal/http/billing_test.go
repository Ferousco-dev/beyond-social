package httpserver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
)

type fakeBilling struct {
	handled  []string
	checkout error
	saved    billing.Pack
}

func (f *fakeBilling) Packs(_ context.Context, enabledOnly bool) ([]billing.Pack, error) {
	if enabledOnly {
		return []billing.Pack{{ID: postID, Name: "Starter", Credits: 200, PriceCents: 1000, Currency: "usd", Enabled: true}}, nil
	}
	return []billing.Pack{{ID: postID, Name: "Starter"}, {ID: "off", Name: "Hidden"}}, nil
}
func (f *fakeBilling) SavePack(_ context.Context, p billing.Pack, _ string) (billing.Pack, error) {
	if err := p.Validate(); err != nil {
		return billing.Pack{}, err
	}
	f.saved = p
	return p, nil
}
func (f *fakeBilling) DeletePack(_ context.Context, id string) error {
	if id != postID {
		return billing.ErrNotFound
	}
	return nil
}
func (f *fakeBilling) Payments(context.Context, string) ([]billing.Payment, error) {
	return []billing.Payment{{ID: "p1", PackName: "Starter", Credits: 200, Status: "paid"}}, nil
}
func (f *fakeBilling) Checkout(context.Context, string, string, string) (string, error) {
	return "https://checkout.stripe.com/c/pay/cs_1", f.checkout
}
func (f *fakeBilling) Subscribe(context.Context, string, string) (string, error) {
	return "https://checkout.stripe.com/c/pay/sub_1", f.checkout
}
func (f *fakeBilling) Portal(context.Context, string) (string, error) {
	return "https://billing.stripe.com/p/session_1", f.checkout
}
func (f *fakeBilling) Handle(_ context.Context, payload []byte) error {
	f.handled = append(f.handled, string(payload))
	return nil
}

func TestBillingEndpoints(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	fake := &fakeBilling{}
	h.deps.Billing = fake
	h.deps.StripeWebhookSecret = func(context.Context) string { return "whsec_test" }
	h.rebuild()
	h.profiles.rows[bob] = accounts.Profile{ID: bob, Role: accounts.RoleAdmin}
	user, admin := h.token(t, alice), h.token(t, bob)

	// The pack list is public: the pricing page shows it before sign-in.
	if res := send(h, http.MethodGet, "/api/v1/packs", "", ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "Starter") || strings.Contains(res.Body.String(), "Hidden") {
		t.Fatalf("public packs: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/credits/checkout", "", `{"pack_id":"`+postID+`"}`); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous checkout: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/credits/checkout", user, `{"pack_id":"`+postID+`"}`); res.Code != http.StatusForbidden || !strings.Contains(res.Body.String(), "upgrade_required") {
		t.Fatalf("a Free member bought a pack: %d %s", res.Code, res.Body)
	}
	h.deps.Usage = &fakeUsage{plan: credits.PlanPro}
	h.rebuild()
	if res := send(h, http.MethodGet, "/api/v1/plans", "", ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"pro_price_cents":2000`) {
		t.Fatalf("plans: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/subscription/checkout", user, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "sub_1") {
		t.Fatalf("subscribe: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/subscription/portal", user, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "billing.stripe.com") {
		t.Fatalf("portal: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/credits/checkout", user, `{"pack_id":"`+postID+`"}`); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "checkout.stripe.com") {
		t.Fatalf("checkout: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/credits/checkout", user, `{"pack_id":"nope"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("bad pack id: %d", res.Code)
	}
	fake.checkout = billing.ErrNotFound
	if res := send(h, http.MethodPost, "/api/v1/credits/checkout", user, `{"pack_id":"`+postID+`"}`); res.Code != http.StatusNotFound {
		t.Fatalf("unsellable pack: %d", res.Code)
	}
	fake.checkout = billing.ErrUnavailable
	if res := send(h, http.MethodPost, "/api/v1/credits/checkout", user, `{"pack_id":"`+postID+`"}`); res.Code != http.StatusServiceUnavailable {
		t.Fatalf("no stripe key: %d", res.Code)
	}
	if res := send(h, http.MethodGet, "/api/v1/credits/payments", user, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "Starter") {
		t.Fatalf("payments: %d %s", res.Code, res.Body)
	}

	if res := send(h, http.MethodGet, "/api/v1/admin/packs", user, ""); res.Code != http.StatusNotFound {
		t.Fatalf("a normal user reached admin packs: %d", res.Code)
	}
	if res := send(h, http.MethodGet, "/api/v1/admin/packs", admin, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "Hidden") {
		t.Fatalf("admin packs: %d", res.Code)
	}
	body := `{"name":"Pro","credits":500,"price_cents":2000,"currency":"usd","enabled":true,"sort":2}`
	if res := send(h, http.MethodPost, "/api/v1/admin/packs", admin, body); res.Code != http.StatusOK || fake.saved.ID != "" || fake.saved.Credits != 500 {
		t.Fatalf("create: %d %+v", res.Code, fake.saved)
	}
	// The address decides which pack is edited, whatever the body says.
	if res := send(h, http.MethodPut, "/api/v1/admin/packs/"+postID, admin, `{"id":"other","name":"Pro","credits":500,"price_cents":2000,"currency":"usd"}`); res.Code != http.StatusOK || fake.saved.ID != postID {
		t.Fatalf("update: %d %+v", res.Code, fake.saved)
	}
	if res := send(h, http.MethodPost, "/api/v1/admin/packs", admin, `{"name":"Cheap","credits":5,"price_cents":10,"currency":"usd"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("invalid pack: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/admin/packs/"+postID, admin, ""); res.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/admin/packs/"+"70000000-0000-4000-8000-000000000009", admin, ""); res.Code != http.StatusNotFound {
		t.Fatalf("delete missing: %d", res.Code)
	}

	// Stripe's callback: only a correctly signed, recent body is acted on.
	payload := []byte(`{"type":"checkout.session.completed","data":{"object":{"id":"cs_1","payment_status":"paid"}}}`)
	post := func(header string) int {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/callbacks/stripe", strings.NewReader(string(payload)))
		if header != "" {
			req.Header.Set("Stripe-Signature", header)
		}
		rec := httptest.NewRecorder()
		h.handler.ServeHTTP(rec, req)
		return rec.Code
	}
	if code := post(""); code != http.StatusUnauthorized || len(fake.handled) != 0 {
		t.Fatalf("unsigned: %d handled=%d", code, len(fake.handled))
	}
	if code := post(billing.Sign(payload, "whsec_wrong", time.Now())); code != http.StatusUnauthorized {
		t.Fatalf("wrong secret: %d", code)
	}
	if code := post(billing.Sign(payload, "whsec_test", time.Now().Add(-time.Hour))); code != http.StatusUnauthorized {
		t.Fatalf("replayed old message: %d", code)
	}
	if code := post(billing.Sign(payload, "whsec_test", time.Now())); code != http.StatusOK || len(fake.handled) != 1 {
		t.Fatalf("signed: %d handled=%d", code, len(fake.handled))
	}
}
