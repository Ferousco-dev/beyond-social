package database

import "testing"

func TestASavedSettingIsReadAtOnceDespiteTheCache(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	store := NewCreditStore(pool)
	before, ok, err := store.Setting(ctx, "free_search_results")
	if err != nil || !ok {
		t.Fatalf("read: %d %v %v", before, ok, err)
	}
	if saved, err := NewAdminCreditStore(store).SaveSetting(ctx, "free_search_results", before+5, ""); err != nil || !saved {
		t.Fatalf("save: %v %v", saved, err)
	}
	after, _, err := store.Setting(ctx, "free_search_results")
	if err != nil || after != before+5 {
		t.Fatalf("a saved setting must not wait out the cache: got %d, want %d (%v)", after, before+5, err)
	}
	if _, ok, _ := store.Setting(ctx, "no_such_setting"); ok {
		t.Fatal("an unknown setting must read as missing")
	}
}
