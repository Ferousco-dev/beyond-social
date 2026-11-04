package database

import (
	"context"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/billing"
	"github.com/google/uuid"
)

func TestRevenueHistorySeparatesCurrenciesAndRefunds(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewBillingStore(pool)
	userID := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, userID, userID[:8]+"@example.com", "User"); err != nil {
		t.Fatal(err)
	}
	for _, invoice := range []billing.Invoice{
		{ID: "in_usd_" + userID, UserID: userID, AmountCents: 2000, Currency: "USD"},
		{ID: "in_eur_" + userID, UserID: userID, AmountCents: 1200, Currency: "EUR"},
	} {
		if err := store.SaveInvoice(ctx, invoice); err != nil {
			t.Fatal(err)
		}
	}
	pack := billing.Pack{Name: "Revenue test", Credits: 100, PriceCents: 700, Currency: "usd", Enabled: true}
	pack, err := store.SavePack(ctx, pack, "")
	if err != nil {
		t.Fatal(err)
	}
	paid, err := store.CreatePayment(ctx, userID, pack)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.MarkPaid(ctx, paid.ID, "pi_paid_"+userID); err != nil {
		t.Fatal(err)
	}
	refunded, err := store.CreatePayment(ctx, userID, pack)
	if err != nil {
		t.Fatal(err)
	}
	if err := store.MarkPaid(ctx, refunded.ID, "pi_refund_"+userID); err != nil {
		t.Fatal(err)
	}
	if err := store.AddRemoved(ctx, refunded.ID, pack.Credits, true); err != nil {
		t.Fatal(err)
	}

	points, err := store.RevenueHistory(ctx, 7)
	if err != nil {
		t.Fatal(err)
	}
	byCurrency := map[string]billing.RevenuePoint{}
	for _, point := range points {
		if point.Date == points[len(points)-1].Date {
			byCurrency[point.Currency] = point
		}
	}
	if usd := byCurrency["usd"]; usd.SubscriptionCents != 2000 || usd.PackCents != 700 || usd.RefundCents != 700 {
		t.Fatalf("USD point = %+v", usd)
	}
	if eur := byCurrency["eur"]; eur.SubscriptionCents != 1200 || eur.PackCents != 0 || eur.RefundCents != 0 {
		t.Fatalf("EUR point = %+v", eur)
	}
}
