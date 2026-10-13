package billing

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

type memStore struct {
	invoices []Invoice
	subs     map[string]Subscription
	packs    map[string]Pack
	payments map[string]*Payment
	sessions map[string]string
	intents  map[string]string
}

func newMem() *memStore {
	return &memStore{subs: map[string]Subscription{}, packs: map[string]Pack{}, payments: map[string]*Payment{}, sessions: map[string]string{}, intents: map[string]string{}}
}

func (m *memStore) Packs(context.Context, bool) ([]Pack, error) { return nil, nil }
func (m *memStore) Pack(_ context.Context, id string) (Pack, error) {
	p, ok := m.packs[id]
	if !ok {
		return Pack{}, ErrNotFound
	}
	return p, nil
}
func (m *memStore) SavePack(context.Context, Pack, string) (Pack, error) { return Pack{}, nil }
func (m *memStore) DeletePack(context.Context, string) error             { return nil }
func (m *memStore) CreatePayment(_ context.Context, userID string, p Pack) (Payment, error) {
	id := "pay-" + string(rune('a'+len(m.payments)))
	m.payments[id] = &Payment{ID: id, UserID: userID, PackName: p.Name, Credits: p.Credits, AmountCents: p.PriceCents, Currency: p.Currency, Status: "pending"}
	return *m.payments[id], nil
}
func (m *memStore) AttachSession(_ context.Context, id, session string) error {
	m.sessions[session] = id
	return nil
}
func (m *memStore) PaymentBySession(_ context.Context, s string) (Payment, error) {
	id, ok := m.sessions[s]
	if !ok {
		return Payment{}, ErrNotFound
	}
	return *m.payments[id], nil
}
func (m *memStore) PaymentByIntent(_ context.Context, i string) (Payment, error) {
	id, ok := m.intents[i]
	if !ok {
		return Payment{}, ErrNotFound
	}
	return *m.payments[id], nil
}
func (m *memStore) MarkPaid(_ context.Context, id, intent string) error {
	p := m.payments[id]
	if p.Status == "pending" {
		p.Status = "paid"
	}
	if intent != "" {
		m.intents[intent] = id
	}
	return nil
}
func (m *memStore) AddRemoved(_ context.Context, id string, n int, full bool) error {
	p := m.payments[id]
	p.CreditsRemoved += n
	if full {
		p.Status = "refunded"
	}
	return nil
}
func (m *memStore) SaveSubscription(_ context.Context, s Subscription) error {
	if old, ok := m.subs[s.UserID]; ok {
		if s.StripeCustomer == "" {
			s.StripeCustomer = old.StripeCustomer
		}
		if s.PeriodEnd == nil {
			s.PeriodEnd = old.PeriodEnd
		}
	}
	m.subs[s.UserID] = s
	return nil
}
func (m *memStore) SubscriptionOf(_ context.Context, u string) (Subscription, error) {
	s, ok := m.subs[u]
	if !ok {
		return Subscription{}, ErrNotFound
	}
	return s, nil
}
func (m *memStore) UserOfSubscription(_ context.Context, id string) (string, error) {
	for u, s := range m.subs {
		if s.StripeSubscription == id {
			return u, nil
		}
	}
	return "", ErrNotFound
}
func (m *memStore) UserOfCustomer(_ context.Context, c string) (string, error) {
	for u, s := range m.subs {
		if s.StripeCustomer == c {
			return u, nil
		}
	}
	return "", ErrNotFound
}
func (m *memStore) SaveInvoice(_ context.Context, inv Invoice) error {
	for _, have := range m.invoices {
		if have.ID == inv.ID {
			return nil
		}
	}
	m.invoices = append(m.invoices, inv)
	return nil
}
func (m *memStore) UserPayments(context.Context, string, int) ([]Payment, error) { return nil, nil }

type memCredits struct {
	balance int
	keys    map[string]bool
}

func (c *memCredits) Purchase(_ context.Context, _ string, amount int, key, _ string) (bool, error) {
	if c.keys[key] {
		return false, nil
	}
	c.keys[key] = true
	c.balance += amount
	return true, nil
}
func (c *memCredits) Clawback(_ context.Context, _ string, amount int, key, _ string) (int, error) {
	if c.keys[key] {
		return 0, nil
	}
	c.keys[key] = true
	take := min(amount, c.balance)
	c.balance -= take
	return take, nil
}

type fakeGateway struct {
	in   CheckoutInput
	sub  SubscribeInput
	err  error
	page string
}

func (g *fakeGateway) CreateCheckout(_ context.Context, in CheckoutInput) (string, string, error) {
	g.in = in
	return "cs_test_1", "https://checkout.stripe.com/c/pay/cs_test_1", g.err
}

func (g *fakeGateway) CreateSubscription(_ context.Context, in SubscribeInput) (string, string, error) {
	g.sub = in
	return "cs_sub_1", "https://checkout.stripe.com/c/pay/cs_sub_1", g.err
}
func (g *fakeGateway) CreatePortal(_ context.Context, customer, returnURL string) (string, error) {
	g.page = customer + "|" + returnURL
	return "https://billing.stripe.com/p/session_1", g.err
}

func setup() (*Service, *memStore, *memCredits, *fakeGateway) {
	store, credits, gateway := newMem(), &memCredits{keys: map[string]bool{}}, &fakeGateway{}
	store.packs["p1"] = Pack{ID: "p1", Name: "Starter", Credits: 200, PriceCents: 1000, Currency: "usd", Enabled: true}
	store.packs["off"] = Pack{ID: "off", Name: "Old", Credits: 10, PriceCents: 100, Currency: "usd"}
	return NewService(store, credits, gateway, "https://app.example/"), store, credits, gateway
}

func TestCheckoutSendsTheSnapshotAndReturnsStripesPage(t *testing.T) {
	svc, store, _, gateway := setup()
	url, err := svc.Checkout(context.Background(), "u1", "a@example.com", "p1")
	if err != nil || !strings.HasPrefix(url, "https://checkout.stripe.com/") {
		t.Fatalf("%q %v", url, err)
	}
	in := gateway.in
	if in.Credits != 200 || in.AmountCents != 1000 || in.UserID != "u1" || in.SuccessURL != "https://app.example/dashboard/credits?paid=1" {
		t.Fatalf("input = %+v", in)
	}
	if store.sessions["cs_test_1"] == "" {
		t.Fatal("the session was not remembered")
	}
	if _, err := svc.Checkout(context.Background(), "u1", "", "off"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("a disabled pack was sold: %v", err)
	}
	gateway.err = provider.ErrNotConfigured("stripe")
	if _, err := svc.Checkout(context.Background(), "u1", "", "p1"); !errors.Is(err, ErrUnavailable) {
		t.Fatalf("a missing Stripe key: %v", err)
	}
	gateway.err = nil
	if _, err := svc.Checkout(context.Background(), "u1", "", "missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("a missing pack was sold: %v", err)
	}
}

func paidEvent(session, status string) []byte {
	return []byte(`{"type":"checkout.session.completed","data":{"object":{"id":"` + session + `","payment_status":"` + status + `","payment_intent":"pi_1"}}}`)
}

func TestAPaymentGrantsCreditsOnceHoweverOftenStripeRepeatsIt(t *testing.T) {
	svc, store, credits, _ := setup()
	ctx := context.Background()
	if _, err := svc.Checkout(ctx, "u1", "", "p1"); err != nil {
		t.Fatal(err)
	}
	// A delayed payment method completes unpaid first: nothing is granted yet.
	if err := svc.Handle(ctx, paidEvent("cs_test_1", "unpaid")); err != nil || credits.balance != 0 {
		t.Fatalf("an unpaid session granted credits: %v %d", err, credits.balance)
	}
	for i := 0; i < 3; i++ {
		if err := svc.Handle(ctx, paidEvent("cs_test_1", "paid")); err != nil {
			t.Fatal(err)
		}
	}
	if credits.balance != 200 {
		t.Fatalf("balance = %d, want 200", credits.balance)
	}
	if p := store.payments["pay-a"]; p.Status != "paid" || store.intents["pi_1"] != "pay-a" {
		t.Fatalf("payment = %+v", p)
	}
	if err := svc.Handle(ctx, paidEvent("cs_unknown", "paid")); !errors.Is(err, ErrNotFound) {
		t.Fatalf("an unknown session: %v", err)
	}
	if err := svc.Handle(ctx, []byte(`{"type":"customer.created","data":{"object":{}}}`)); err != nil {
		t.Fatalf("an unrelated event failed: %v", err)
	}
}

func refundEvent(amount, refunded int) []byte {
	b, _ := json.Marshal(map[string]any{"type": "charge.refunded", "data": map[string]any{"object": map[string]any{"payment_intent": "pi_1", "amount": amount, "amount_refunded": refunded}}})
	return b
}

func TestRefundsTakeBackOnlyWhatIsLeftAndOnlyOnce(t *testing.T) {
	svc, store, credits, _ := setup()
	ctx := context.Background()
	_, _ = svc.Checkout(ctx, "u1", "", "p1")
	_ = svc.Handle(ctx, paidEvent("cs_test_1", "paid"))
	credits.balance = 150 // 50 already spent

	// Half the money back: half the credits (100) are due.
	if err := svc.Handle(ctx, refundEvent(1000, 500)); err != nil || credits.balance != 50 {
		t.Fatalf("partial refund: %v balance %d", err, credits.balance)
	}
	if err := svc.Handle(ctx, refundEvent(1000, 500)); err != nil || credits.balance != 50 {
		t.Fatalf("a repeated refund took credits again: balance %d", credits.balance)
	}
	// The rest: 100 more are due, but only 50 are left. The balance stops at zero.
	if err := svc.Handle(ctx, refundEvent(1000, 1000)); err != nil || credits.balance != 0 {
		t.Fatalf("full refund: %v balance %d", err, credits.balance)
	}
	if p := store.payments["pay-a"]; p.Status != "refunded" || p.CreditsRemoved != 150 {
		t.Fatalf("payment = %+v", p)
	}
}

func TestPackValidation(t *testing.T) {
	good := Pack{Name: "Starter", Credits: 200, PriceCents: 1000, Currency: "usd"}
	if err := good.Validate(); err != nil {
		t.Fatal(err)
	}
	for name, bad := range map[string]Pack{
		"no name":       {Credits: 1, PriceCents: 100, Currency: "usd"},
		"no credits":    {Name: "x", PriceCents: 100, Currency: "usd"},
		"cheap":         {Name: "x", Credits: 1, PriceCents: 10, Currency: "usd"},
		"upper case":    {Name: "x", Credits: 1, PriceCents: 100, Currency: "USD"},
		"long currency": {Name: "x", Credits: 1, PriceCents: 100, Currency: "usdd"},
	} {
		if err := bad.Validate(); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s accepted", name)
		}
	}
}

func TestSignatures(t *testing.T) {
	body, secret, now := []byte(`{"id":"evt_1"}`), "whsec_test", time.Now()
	header := Sign(body, secret, now)
	if err := VerifySignature(body, header, secret, now); err != nil {
		t.Fatal(err)
	}
	for name, tc := range map[string]struct {
		body   []byte
		header string
		secret string
		at     time.Time
	}{
		"wrong secret":    {body, header, "whsec_other", now},
		"changed body":    {[]byte(`{"id":"evt_2"}`), header, secret, now},
		"too old":         {body, header, secret, now.Add(10 * time.Minute)},
		"from the future": {body, header, secret, now.Add(-10 * time.Minute)},
		"no header":       {body, "", secret, now},
		"no secret":       {body, header, "", now},
		"not hex":         {body, "t=1,v1=zz", secret, now},
	} {
		if err := VerifySignature(tc.body, tc.header, tc.secret, tc.at); !errors.Is(err, ErrBadSignature) {
			t.Errorf("%s accepted: %v", name, err)
		}
	}
	// Stripe may send several v1 values while rotating a secret; any match passes.
	if err := VerifySignature(body, header+",v1=00", secret, now); err != nil {
		t.Errorf("a second signature broke a good one: %v", err)
	}
}

func TestStripeClientSendsAnInlinePriceAndReadsTheSession(t *testing.T) {
	var form map[string][]string
	var auth, idem string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth, idem = r.Header.Get("Authorization"), r.Header.Get("Idempotency-Key")
		raw, _ := io.ReadAll(r.Body)
		form, _ = url.ParseQuery(string(raw))
		_, _ = w.Write([]byte(`{"id":"cs_test_9","url":"https://checkout.stripe.com/c/pay/cs_test_9"}`))
	}))
	defer server.Close()
	c := NewStripe(provider.StaticKey("sk_test_1")).WithBase(server.URL, nil)
	id, link, err := c.CreateCheckout(context.Background(), CheckoutInput{PaymentID: "pay-1", UserID: "u1", Email: "a@example.com", PackName: "Starter", Credits: 200, AmountCents: 1000, Currency: "usd", SuccessURL: "https://app/ok", CancelURL: "https://app/no"})
	if err != nil || id != "cs_test_9" || !strings.HasPrefix(link, "https://checkout.stripe.com/") {
		t.Fatalf("%q %q %v", id, link, err)
	}
	if auth != "Bearer sk_test_1" || idem != "checkout:pay-1" {
		t.Fatalf("auth=%q idem=%q", auth, idem)
	}
	for k, want := range map[string]string{
		"mode": "payment", "client_reference_id": "pay-1", "metadata[user_id]": "u1",
		"line_items[0][price_data][unit_amount]": "1000", "line_items[0][price_data][currency]": "usd",
		"line_items[0][price_data][product_data][name]": "Starter: 200 credits",
	} {
		if got := form[k]; len(got) != 1 || got[0] != want {
			t.Errorf("%s = %v, want %s", k, got, want)
		}
	}
}

func TestStripeErrorsAreClassified(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":{"message":"Invalid API Key provided"}}`))
	}))
	defer server.Close()
	c := NewStripe(provider.StaticKey("bad")).WithBase(server.URL, nil)
	if _, _, err := c.CreateCheckout(context.Background(), CheckoutInput{}); err == nil || provider.IsTransient(err) {
		t.Fatalf("err = %v", err)
	}
}

type fixedPrice int

func (p fixedPrice) ProPriceCents(context.Context) int { return int(p) }

func TestSubscribingUsesTheAdminsPriceAndRefusesAMemberWhoAlreadyHasPro(t *testing.T) {
	svc, store, _, gateway := setup()
	svc.WithPrices(fixedPrice(2500))
	ctx := context.Background()
	url, err := svc.Subscribe(ctx, "u1", "a@example.com")
	if err != nil || !strings.HasPrefix(url, "https://checkout.stripe.com/") {
		t.Fatalf("%q %v", url, err)
	}
	if gateway.sub.PriceCents != 2500 || gateway.sub.UserID != "u1" || gateway.sub.SuccessURL != "https://app.example/dashboard/usage?upgraded=1" {
		t.Fatalf("input = %+v", gateway.sub)
	}
	store.subs["u1"] = Subscription{UserID: "u1", Status: "active", StripeCustomer: "cus_1"}
	if _, err := svc.Subscribe(ctx, "u1", ""); !errors.Is(err, ErrAlreadyPro) {
		t.Fatalf("a second membership: %v", err)
	}
	// Someone whose membership ended can start again, under the same Stripe customer.
	store.subs["u1"] = Subscription{UserID: "u1", Status: "canceled", StripeCustomer: "cus_1"}
	if _, err := svc.Subscribe(ctx, "u1", ""); err != nil || gateway.sub.Customer != "cus_1" {
		t.Fatalf("resubscribe: %v %+v", err, gateway.sub)
	}
}

func TestThePortalNeedsAMembership(t *testing.T) {
	svc, store, _, gateway := setup()
	ctx := context.Background()
	if _, err := svc.Portal(ctx, "u1"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("no membership: %v", err)
	}
	store.subs["u1"] = Subscription{UserID: "u1", Status: "active", StripeCustomer: "cus_1"}
	if url, err := svc.Portal(ctx, "u1"); err != nil || !strings.HasPrefix(url, "https://billing.stripe.com/") || gateway.page != "cus_1|https://app.example/dashboard/usage" {
		t.Fatalf("%q %v %q", url, err, gateway.page)
	}
}

func TestStripeMessagesStartChangeAndEndMembership(t *testing.T) {
	svc, store, _, _ := setup()
	ctx := context.Background()
	started := `{"type":"checkout.session.completed","data":{"object":{"id":"cs_1","mode":"subscription","payment_status":"paid","customer":"cus_1","subscription":"sub_1","client_reference_id":"u1"}}}`
	if err := svc.Handle(ctx, []byte(started)); err != nil || store.subs["u1"].Status != "active" || store.subs["u1"].StripeSubscription != "sub_1" {
		t.Fatalf("started: %v %+v", err, store.subs["u1"])
	}
	// The period end can sit on the subscription or, in newer versions, on its item.
	update := func(status, period string) string {
		return `{"type":"customer.subscription.updated","data":{"object":{"id":"sub_1","customer":"cus_1","status":"` + status + `",` + period + `"metadata":{"user_id":"u1"}}}}`
	}
	if err := svc.Handle(ctx, []byte(update("active", `"current_period_end":1800000000,`))); err != nil || store.subs["u1"].PeriodEnd == nil || store.subs["u1"].PeriodEnd.Unix() != 1800000000 {
		t.Fatalf("period on the subscription: %v %+v", err, store.subs["u1"])
	}
	if err := svc.Handle(ctx, []byte(update("past_due", `"items":{"data":[{"current_period_end":1900000000}]},`))); err != nil || store.subs["u1"].Status != "past_due" || store.subs["u1"].PeriodEnd.Unix() != 1900000000 {
		t.Fatalf("period on the item: %v %+v", err, store.subs["u1"])
	}
	// Later messages carry no user id; the subscription id finds the owner.
	ended := `{"type":"customer.subscription.deleted","data":{"object":{"id":"sub_1","customer":"cus_1","status":"active"}}}`
	if err := svc.Handle(ctx, []byte(ended)); err != nil || store.subs["u1"].Status != "canceled" {
		t.Fatalf("ended: %v %+v", err, store.subs["u1"])
	}
	unknown := `{"type":"customer.subscription.updated","data":{"object":{"id":"sub_other","status":"active"}}}`
	if err := svc.Handle(ctx, []byte(unknown)); !errors.Is(err, ErrNotFound) {
		t.Fatalf("a subscription nobody here owns: %v", err)
	}
	// An unpaid subscription checkout does not start Pro.
	unpaid := `{"type":"checkout.session.completed","data":{"object":{"id":"cs_2","mode":"subscription","payment_status":"unpaid","subscription":"sub_9","client_reference_id":"u9"}}}`
	if err := svc.Handle(ctx, []byte(unpaid)); err != nil || store.subs["u9"].Status != "" {
		t.Fatalf("unpaid: %v %+v", err, store.subs["u9"])
	}
}

type noteTaker struct{ notes []string }

func (n *noteTaker) PackBought(user, pack string, credits, _ int, _ string) {
	n.notes = append(n.notes, "pack:"+user+":"+pack)
	_ = credits
}
func (n *noteTaker) ProStarted(user string)    { n.notes = append(n.notes, "started:"+user) }
func (n *noteTaker) PaymentFailed(user string) { n.notes = append(n.notes, "failed:"+user) }
func (n *noteTaker) ProEnded(user string)      { n.notes = append(n.notes, "ended:"+user) }

func TestEmailsGoOutOncePerEventAndOnlyOnARealChange(t *testing.T) {
	svc, store, _, _ := setup()
	notes := &noteTaker{}
	svc.WithNotifier(notes)
	ctx := context.Background()

	_, _ = svc.Checkout(ctx, "u1", "", "p1")
	for i := 0; i < 3; i++ {
		_ = svc.Handle(ctx, paidEvent("cs_test_1", "paid"))
	}
	started := `{"type":"checkout.session.completed","data":{"object":{"id":"cs_9","mode":"subscription","payment_status":"paid","customer":"cus_1","subscription":"sub_1","client_reference_id":"u1"}}}`
	_ = svc.Handle(ctx, []byte(started))
	_ = svc.Handle(ctx, []byte(started))
	update := func(status string) string {
		return `{"type":"customer.subscription.updated","data":{"object":{"id":"sub_1","customer":"cus_1","status":"` + status + `","metadata":{"user_id":"u1"}}}}`
	}
	for _, s := range []string{"active", "past_due", "past_due", "active", "canceled", "canceled"} {
		_ = svc.Handle(ctx, []byte(update(s)))
	}
	want := []string{"pack:u1:Starter", "started:u1", "failed:u1", "ended:u1"}
	if len(notes.notes) != len(want) {
		t.Fatalf("emails = %v, want %v", notes.notes, want)
	}
	for i := range want {
		if notes.notes[i] != want[i] {
			t.Fatalf("emails = %v, want %v", notes.notes, want)
		}
	}
	_ = store
}

func TestPaidInvoicesAreRecordedOnceForTheirOwner(t *testing.T) {
	svc, store, _, _ := setup()
	ctx := context.Background()
	store.subs["u1"] = Subscription{UserID: "u1", Status: "active", StripeCustomer: "cus_1"}
	invoice := `{"type":"invoice.paid","data":{"object":{"id":"in_1","customer":"cus_1","amount_paid":2000,"currency":"usd"}}}`
	for i := 0; i < 2; i++ {
		if err := svc.Handle(ctx, []byte(invoice)); err != nil {
			t.Fatal(err)
		}
	}
	if len(store.invoices) != 1 || store.invoices[0].UserID != "u1" || store.invoices[0].AmountCents != 2000 {
		t.Fatalf("invoices = %+v", store.invoices)
	}
	free := `{"type":"invoice.paid","data":{"object":{"id":"in_2","customer":"cus_1","amount_paid":0,"currency":"usd"}}}`
	if err := svc.Handle(ctx, []byte(free)); err != nil || len(store.invoices) != 1 {
		t.Fatalf("a zero invoice was recorded: %v %+v", err, store.invoices)
	}
	other := `{"type":"invoice.paid","data":{"object":{"id":"in_3","customer":"cus_other","amount_paid":500,"currency":"usd"}}}`
	if err := svc.Handle(ctx, []byte(other)); !errors.Is(err, ErrNotFound) {
		t.Fatalf("an invoice for a stranger: %v", err)
	}
}

func TestTaxIsRequestedOnlyWhenTheAdminTurnsItOn(t *testing.T) {
	svc, _, _, gateway := setup()
	on := false
	svc.WithTax(func(context.Context) bool { return on })
	ctx := context.Background()
	_, _ = svc.Checkout(ctx, "u1", "", "p1")
	if gateway.in.Tax {
		t.Fatal("tax was requested while off")
	}
	on = true
	_, _ = svc.Checkout(ctx, "u1", "", "p1")
	_, _ = svc.Subscribe(ctx, "u2", "")
	if !gateway.in.Tax || !gateway.sub.Tax {
		t.Fatalf("tax was not requested: %+v %+v", gateway.in, gateway.sub)
	}
}

func TestStripeFormCarriesAutomaticTax(t *testing.T) {
	var form url.Values
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		form, _ = url.ParseQuery(string(raw))
		_, _ = w.Write([]byte(`{"id":"cs_1","url":"https://checkout.stripe.com/c/pay/cs_1"}`))
	}))
	defer server.Close()
	c := NewStripe(provider.StaticKey("k")).WithBase(server.URL, nil)
	if _, _, err := c.CreateCheckout(context.Background(), CheckoutInput{Currency: "usd", AmountCents: 1000, Tax: true}); err != nil || form.Get("automatic_tax[enabled]") != "true" {
		t.Fatalf("pack: %v %v", err, form)
	}
	if _, _, err := c.CreateSubscription(context.Background(), SubscribeInput{Currency: "usd", PriceCents: 2000, Tax: true}); err != nil || form.Get("automatic_tax[enabled]") != "true" {
		t.Fatalf("subscription: %v %v", err, form)
	}
	if _, _, err := c.CreateSubscription(context.Background(), SubscribeInput{Currency: "usd", PriceCents: 2000}); err != nil || form.Has("automatic_tax[enabled]") {
		t.Fatalf("tax appeared by itself: %v", form)
	}
}
