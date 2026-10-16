package database

import (
	"context"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/google/uuid"
)

func TestProfileStoresRegistrationDetails(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewProfileStore(pool)
	userID := uuid.NewString()
	if _, err := store.Ensure(ctx, userID, userID[:8]+"@example.com", "User"); err != nil {
		t.Fatal(err)
	}
	if err := store.SetRegistrationDetails(ctx, userID, accounts.RegistrationDetails{
		Phone: "+1 555 0100", BusinessName: "Studio", Industry: "Retail",
	}); err != nil {
		t.Fatal(err)
	}
	var phone, business, industry string
	if err := pool.QueryRow(ctx, `select phone, business_name, industry from public.profiles where id = $1`, userID).Scan(&phone, &business, &industry); err != nil {
		t.Fatal(err)
	}
	if phone != "+1 555 0100" || business != "Studio" || industry != "Retail" {
		t.Fatalf("stored values = %q, %q, %q", phone, business, industry)
	}
}
