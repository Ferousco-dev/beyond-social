package database

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/social"
	"github.com/google/uuid"
)

func TestSocialConnectionsAreOwnedReplaceInPlaceAndStatesWorkOnce(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewSocialStore(pool)
	alice, bob := uuid.NewString(), uuid.NewString()
	for _, id := range []string{alice, bob} {
		if _, err := NewProfileStore(pool).Ensure(ctx, id, id[:8]+"@example.com", "U"); err != nil {
			t.Fatal(err)
		}
	}

	exp := time.Now().Add(time.Hour)
	conn := social.Connection{UserID: alice, Platform: social.YouTube, AccountID: "UC1", AccountName: "First", AccessCT: []byte("a1"), RefreshCT: []byte("r1"), ExpiresAt: &exp, Scopes: []string{"upload"}}
	if err := store.Upsert(ctx, conn); err != nil {
		t.Fatal(err)
	}
	conn.AccountName, conn.AccessCT = "Second", []byte("a2")
	if err := store.Upsert(ctx, conn); err != nil {
		t.Fatal(err)
	}
	list, err := store.List(ctx, alice)
	if err != nil || len(list) != 1 || list[0].AccountName != "Second" || string(list[0].AccessCT) != "a2" {
		t.Fatalf("reconnecting must replace in place: %+v err=%v", list, err)
	}
	if other, _ := store.List(ctx, bob); len(other) != 0 {
		t.Fatalf("a stranger lists %+v", other)
	}
	if _, err := store.Get(ctx, bob, social.YouTube); !errors.Is(err, social.ErrNotConnected) {
		t.Fatalf("a stranger read it: %v", err)
	}

	id := list[0].ID
	if err := store.MarkRevoked(ctx, id); err != nil {
		t.Fatal(err)
	}
	if got, _ := store.Get(ctx, alice, social.YouTube); got.RevokedAt == nil {
		t.Fatal("not marked revoked")
	}
	if err := store.Upsert(ctx, conn); err != nil {
		t.Fatal(err)
	}
	if got, _ := store.Get(ctx, alice, social.YouTube); got.RevokedAt != nil {
		t.Fatal("signing in again must clear the revoked flag")
	}
	if err := store.UpdateTokens(ctx, id, []byte("a3"), nil, &exp); err != nil {
		t.Fatal(err)
	}
	if got, _ := store.Get(ctx, alice, social.YouTube); string(got.AccessCT) != "a3" || string(got.RefreshCT) != "r1" {
		t.Fatalf("a renewal without a new refresh token must keep the old one: %+v", got)
	}

	hash := []byte("state-hash")
	if err := store.SaveState(ctx, hash, alice, social.YouTube, []byte("v"), time.Now().Add(time.Minute)); err != nil {
		t.Fatal(err)
	}
	if p, ok, err := store.TakeState(ctx, hash, time.Now()); err != nil || !ok || p.UserID != alice || p.Platform != social.YouTube {
		t.Fatalf("take = %+v ok=%v err=%v", p, ok, err)
	}
	if _, ok, _ := store.TakeState(ctx, hash, time.Now()); ok {
		t.Fatal("a state worked twice")
	}
	_ = store.SaveState(ctx, []byte("old"), alice, social.YouTube, []byte("v"), time.Now().Add(-time.Minute))
	if _, ok, _ := store.TakeState(ctx, []byte("old"), time.Now()); ok {
		t.Fatal("an expired state worked")
	}

	if gone, err := store.Delete(ctx, alice, social.YouTube); err != nil || gone.ID != id {
		t.Fatalf("delete = %+v err=%v", gone, err)
	}
	if _, err := store.Delete(ctx, alice, social.YouTube); !errors.Is(err, social.ErrNotConnected) {
		t.Fatalf("deleting twice: %v", err)
	}
}
