package database

import (
	"errors"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/google/uuid"
)

func TestLibraryGroupsFileAssetsOnlyForTheirOwner(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	store := NewAssetLibraryStore(pool)
	user, other := uuid.NewString(), uuid.NewString()
	for _, id := range []string{user, other} {
		if _, err := NewProfileStore(pool).Ensure(ctx, id, id+"@example.com", "P"); err != nil {
			t.Fatal(err)
		}
	}
	image, err := NewMediaStore(pool).Create(ctx, media.Item{ID: uuid.NewString(), UserID: user, Kind: media.KindImage, Name: "a.png", MIME: "image/png", Size: 1, Path: user + "/a.png"})
	if err != nil {
		t.Fatal(err)
	}
	face, err := store.Create(ctx, assetlib.Asset{UserID: user, Kind: assetlib.KindFace, Label: "Ada", MediaID: image.ID})
	if err != nil || face.GroupID != nil {
		t.Fatalf("a new asset is in no group: %+v %v", face, err)
	}

	ada, err := store.CreateGroup(ctx, user, "Ada")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.CreateGroup(ctx, user, "ADA"); !errors.Is(err, assetlib.ErrGroupNameTaken) {
		t.Fatalf("group names are unique ignoring case: %v", err)
	}
	if _, err := store.CreateGroup(ctx, other, "Ada"); err != nil {
		t.Fatalf("another person may use the same name: %v", err)
	}
	theirs, _ := store.ListGroups(ctx, other)

	got, err := store.Assign(ctx, user, face.ID, ada.ID)
	if err != nil || got.GroupID == nil || *got.GroupID != ada.ID {
		t.Fatalf("assign: %+v %v", got, err)
	}
	if _, err := store.Assign(ctx, user, face.ID, theirs[0].ID); !errors.Is(err, assetlib.ErrGroupNotFound) {
		t.Fatalf("someone else's group must not take my asset: %v", err)
	}
	if _, err := store.Assign(ctx, other, face.ID, theirs[0].ID); !errors.Is(err, assetlib.ErrNotFound) {
		t.Fatalf("someone else must not move my asset: %v", err)
	}
	if renamed, err := store.RenameGroup(ctx, user, ada.ID, "Ada Lovelace"); err != nil || renamed.Name != "Ada Lovelace" {
		t.Fatalf("rename: %+v %v", renamed, err)
	}
	if err := store.DeleteGroup(ctx, other, ada.ID); !errors.Is(err, assetlib.ErrGroupNotFound) {
		t.Fatalf("someone else must not delete my group: %v", err)
	}
	if err := store.DeleteGroup(ctx, user, ada.ID); err != nil {
		t.Fatal(err)
	}
	after, err := store.Get(ctx, user, face.ID)
	if err != nil || after.GroupID != nil {
		t.Fatalf("deleting a group keeps its assets, ungrouped: %+v %v", after, err)
	}
	if got, err := store.Assign(ctx, user, face.ID, ""); err != nil || got.GroupID != nil {
		t.Fatalf("ungroup: %+v %v", got, err)
	}
}

func TestPruneLogsDeletesOnlyOldRows(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, user+"@example.com", "P"); err != nil {
		t.Fatal(err)
	}
	for _, age := range []string{"500 days", "1 day"} {
		if _, err := pool.Exec(ctx, `insert into public.ai_usage (provider, model, purpose, user_id, input_tokens, output_tokens, total_tokens, created_at)
			values ('gemini', 'm', 'p', $1, 1, 1, 2, now() - $2::interval)`, user, age); err != nil {
			t.Fatal(err)
		}
	}
	n, err := NewPurgeStore(pool).PruneLogs(ctx, time.Now().Add(-395*24*time.Hour))
	if err != nil || n != 1 {
		t.Fatalf("pruned %d, %v", n, err)
	}
	var left int
	if err := pool.QueryRow(ctx, `select count(*) from public.ai_usage where user_id = $1`, user).Scan(&left); err != nil || left != 1 {
		t.Fatalf("left %d, %v", left, err)
	}
}
