package database

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestSettingsAreStoredAndReplaced(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	store := NewSettingsStore(pool)
	key := "test." + uuid.NewString()[:8]
	if _, found, err := store.Get(ctx, key); err != nil || found {
		t.Fatalf("before: %v %v", found, err)
	}
	if err := store.Set(ctx, key, "gemini", ""); err != nil {
		t.Fatal(err)
	}
	if err := store.Set(ctx, key, "openrouter:vendor/model", ""); err != nil {
		t.Fatal(err)
	}
	if v, found, err := store.Get(ctx, key); err != nil || !found || v != "openrouter:vendor/model" {
		t.Fatalf("after: %q %v %v", v, found, err)
	}
}
