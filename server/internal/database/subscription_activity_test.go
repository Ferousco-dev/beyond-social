package database

import (
	"context"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
	"github.com/google/uuid"
)

func TestSubscriptionActivityPersistsTransitionsAndRetries(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewBillingStore(pool)
	userID := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, userID, userID[:8]+"@example.com", "User"); err != nil {
		t.Fatal(err)
	}
	periodEnd := time.Now().AddDate(0, 0, 30).UTC()
	sub := billing.Subscription{UserID: userID, Status: "active", StripeCustomer: "cus_" + userID[:8], StripeSubscription: "sub_" + userID[:8], PeriodEnd: &periodEnd}
	for i := 0; i < 2; i++ {
		if err := store.SaveSubscription(ctx, sub); err != nil {
			t.Fatal(err)
		}
	}
	sub.Status = "past_due"
	if err := store.SaveSubscription(ctx, sub); err != nil {
		t.Fatal(err)
	}
	nextPeriod := periodEnd.AddDate(0, 0, 30)
	sub.PeriodEnd = &nextPeriod
	if err := store.SaveSubscription(ctx, sub); err != nil {
		t.Fatal(err)
	}

	invoice := billing.Invoice{ID: "in_paid_" + userID, UserID: userID, AmountCents: 2000, Currency: "usd"}
	for i := 0; i < 2; i++ {
		if err := store.SaveInvoice(ctx, invoice); err != nil {
			t.Fatal(err)
		}
	}
	failed := billing.Invoice{ID: "in_failed_" + userID, UserID: userID, AmountCents: 2000, Currency: "usd", AttemptCount: 2}
	for i := 0; i < 2; i++ {
		if err := store.RecordInvoiceFailure(ctx, failed); err != nil {
			t.Fatal(err)
		}
	}
	failed.AttemptCount = 3
	if err := store.RecordInvoiceFailure(ctx, failed); err != nil {
		t.Fatal(err)
	}

	overview, err := store.Overview(ctx, 2000)
	if err != nil {
		t.Fatal(err)
	}
	counts := map[string]int{}
	for _, event := range overview.Activity {
		if event.Email == userID[:8]+"@example.com" {
			counts[event.EventType]++
		}
	}
	want := map[string]int{"started": 1, "status_changed": 1, "renewed": 1, "invoice_paid": 1, "invoice_payment_failed": 2}
	for kind, count := range want {
		if counts[kind] != count {
			t.Errorf("%s events = %d, want %d; all events: %+v", kind, counts[kind], count, overview.Activity)
		}
	}
}
