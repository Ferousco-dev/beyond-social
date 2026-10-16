package database

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"github.com/google/uuid"
)

func TestPacksAndPaymentsEndToEnd(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewBillingStore(pool)
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, user[:8]+"@example.com", "U"); err != nil {
		t.Fatal(err)
	}

	pack, err := store.SavePack(ctx, billing.Pack{Name: "Test pack " + user[:6], Credits: 120, PriceCents: 600, Currency: "usd", Enabled: true, Sort: 99}, "")
	if err != nil || pack.ID == "" {
		t.Fatalf("create: %+v %v", pack, err)
	}
	pack.PriceCents = 700
	if saved, err := store.SavePack(ctx, pack, ""); err != nil || saved.PriceCents != 700 {
		t.Fatalf("update: %+v %v", saved, err)
	}
	if _, err := store.SavePack(ctx, billing.Pack{ID: uuid.NewString(), Name: "x", Credits: 1, PriceCents: 100, Currency: "usd"}, ""); !errors.Is(err, billing.ErrNotFound) {
		t.Fatalf("updating a missing pack: %v", err)
	}
	pack.Enabled = false
	if _, err := store.SavePack(ctx, pack, ""); err != nil {
		t.Fatal(err)
	}
	enabled, _ := store.Packs(ctx, true)
	for _, p := range enabled {
		if p.ID == pack.ID {
			t.Fatal("a disabled pack is listed for sale")
		}
	}

	svc := billing.NewService(store, credits.NewService(NewCreditStore(pool)), nil, "https://app.example")
	pay, err := store.CreatePayment(ctx, user, pack)
	if err != nil || pay.Status != "pending" || pay.Credits != 120 {
		t.Fatalf("payment: %+v %v", pay, err)
	}
	session := "cs_test_" + uuid.NewString()
	if err := store.AttachSession(ctx, pay.ID, session); err != nil {
		t.Fatal(err)
	}
	if list, _ := store.UserPayments(ctx, user, 10); len(list) != 0 {
		t.Fatalf("a pending payment is shown as a receipt: %+v", list)
	}

	intent := "pi_" + uuid.NewString()
	for i := 0; i < 2; i++ {
		if err := svc.Paid(ctx, session, intent); err != nil {
			t.Fatal(err)
		}
	}
	if bal, _ := NewCreditStore(pool).Balance(ctx, user); bal != 120 {
		t.Fatalf("balance = %d, want 120 after a repeated payment message", bal)
	}
	got, err := store.PaymentByIntent(ctx, intent)
	if err != nil || got.Status != "paid" || got.PaidAt == nil {
		t.Fatalf("by intent: %+v %v", got, err)
	}

	if err := svc.Refunded(ctx, intent, 700, 700); err != nil {
		t.Fatal(err)
	}
	after, _ := store.PaymentByIntent(ctx, intent)
	if after.Status != "refunded" || after.CreditsRemoved != 120 {
		t.Fatalf("after refund: %+v", after)
	}
	if bal, _ := NewCreditStore(pool).Balance(ctx, user); bal != 0 {
		t.Fatalf("balance after refund = %d", bal)
	}
	if err := store.DeletePack(ctx, pack.ID); err != nil {
		t.Fatal(err)
	}
	if err := store.DeletePack(ctx, pack.ID); !errors.Is(err, billing.ErrNotFound) {
		t.Fatalf("deleting twice: %v", err)
	}
	// The payment keeps its own copy, so deleting the pack leaves the receipt intact.
	if kept, err := store.PaymentBySession(ctx, session); err != nil || kept.PackName == "" {
		t.Fatalf("receipt lost with the pack: %+v %v", kept, err)
	}
}

func TestSubscriptionsKeepWhatEarlierMessagesLearned(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewBillingStore(pool)
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, user[:8]+"@example.com", "U"); err != nil {
		t.Fatal(err)
	}
	if _, err := store.SubscriptionOf(ctx, user); !errors.Is(err, billing.ErrNotFound) {
		t.Fatalf("before: %v", err)
	}
	sub := "sub_" + uuid.NewString()
	end := time.Now().Add(30 * 24 * time.Hour).UTC().Truncate(time.Second)
	if err := store.SaveSubscription(ctx, billing.Subscription{UserID: user, Status: "active", StripeCustomer: "cus_1", StripeSubscription: sub, PeriodEnd: &end}); err != nil {
		t.Fatal(err)
	}
	// A later message that knows only the new status must not erase the customer or the period.
	if err := store.SaveSubscription(ctx, billing.Subscription{UserID: user, Status: "past_due"}); err != nil {
		t.Fatal(err)
	}
	got, err := store.SubscriptionOf(ctx, user)
	if err != nil || got.Status != "past_due" || got.StripeCustomer != "cus_1" || got.StripeSubscription != sub || got.PeriodEnd == nil || !got.PeriodEnd.Equal(end) {
		t.Fatalf("subscription = %+v %v", got, err)
	}
	if owner, err := store.UserOfSubscription(ctx, sub); err != nil || owner != user {
		t.Fatalf("owner = %q %v", owner, err)
	}
	if _, err := store.UserOfSubscription(ctx, "sub_missing"); !errors.Is(err, billing.ErrNotFound) {
		t.Fatalf("missing: %v", err)
	}
}

func TestOverviewCountsMoneyAndMembers(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewBillingStore(pool)
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, user[:8]+"@example.com", "U"); err != nil {
		t.Fatal(err)
	}
	before, err := store.Overview(ctx, 2000)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.SaveSubscription(ctx, billing.Subscription{UserID: user, Status: "active", StripeCustomer: "cus_" + user[:8], StripeSubscription: "sub_" + user[:8]}); err != nil {
		t.Fatal(err)
	}
	canceledUser := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, canceledUser, canceledUser[:8]+"@example.com", "Canceled"); err != nil {
		t.Fatal(err)
	}
	if err := store.SaveSubscription(ctx, billing.Subscription{UserID: canceledUser, Status: "canceled"}); err != nil {
		t.Fatal(err)
	}
	inv := billing.Invoice{ID: "in_" + user, UserID: user, AmountCents: 2000, Currency: "usd"}
	for i := 0; i < 2; i++ {
		if err := store.SaveInvoice(ctx, inv); err != nil {
			t.Fatal(err)
		}
	}
	if owner, err := store.UserOfCustomer(ctx, "cus_"+user[:8]); err != nil || owner != user {
		t.Fatalf("owner = %q %v", owner, err)
	}
	after, err := store.Overview(ctx, 2000)
	if err != nil {
		t.Fatal(err)
	}
	if after.ActiveSubscribers != before.ActiveSubscribers+1 || after.CanceledSubscribers != 1 || after.SubscriptionCents != before.SubscriptionCents+2000 || after.MonthlyRecurringCents != after.ActiveSubscribers*2000 {
		t.Fatalf("before %+v after %+v", before, after)
	}
	found := false
	foundCanceled := false
	for _, s := range after.Subscribers {
		found = found || s.Status == "active"
		foundCanceled = foundCanceled || s.Status == "canceled"
	}
	if !found || !foundCanceled {
		t.Fatalf("subscribers = %+v", after.Subscribers)
	}
}
