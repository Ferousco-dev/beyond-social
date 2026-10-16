package database

import (
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/assets"
	"github.com/google/uuid"
)

func TestAssetGroupsRoundTrip(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	store := NewAssetStore(pool)
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, "g@example.com", "G"); err != nil {
		t.Fatal(err)
	}

	first, err := store.Create(ctx, user, "avatar001")
	if err != nil || first.Name != "avatar001" {
		t.Fatalf("create: %+v %v", first, err)
	}
	if _, err := store.Create(ctx, user, "avatar001"); err == nil {
		t.Fatal("duplicate names must fail per user")
	}
	other := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, other, "h@example.com", "H"); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Create(ctx, other, "avatar001"); err != nil {
		t.Fatalf("names are per user: %v", err)
	}

	updated, err := store.Update(ctx, user, first.ID, "Summer launch", assets.Slots{Face: "media-1"}, []assets.Extra{{ID: "media-2", Label: "Alt angle"}})
	if err != nil || updated.Name != "Summer launch" || updated.Slots.Face != "media-1" || len(updated.Extras) != 1 {
		t.Fatalf("update: %+v %v", updated, err)
	}
	got, err := store.Get(ctx, user, first.ID)
	if err != nil || got.Slots.Face != "media-1" || got.Extras[0].Label != "Alt angle" {
		t.Fatalf("get: %+v %v", got, err)
	}
	if _, err := store.Get(ctx, other, first.ID); err == nil {
		t.Fatal("another user's group is invisible")
	}

	consented, err := store.Consent(ctx, user, first.ID, "face")
	if err != nil || consented.FaceConsent == nil {
		t.Fatalf("consent: %+v %v", consented, err)
	}
	if err := store.Delete(ctx, user, first.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := store.Get(ctx, user, first.ID); err == nil {
		t.Fatal("deleted group must be gone")
	}
}
