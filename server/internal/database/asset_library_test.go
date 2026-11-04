package database

import (
	"errors"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/Ferousco-dev/beyond-social/server/internal/assets"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/migrations"
	"github.com/google/uuid"
)

func TestAssetLibraryRoundTrip(t *testing.T) {
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
	if err != nil || face.FileKind != "image" || face.ConsentAt != nil {
		t.Fatalf("create: %+v %v", face, err)
	}
	if _, err := store.Create(ctx, assetlib.Asset{UserID: user, Kind: assetlib.KindFace, Label: "ADA", MediaID: image.ID}); !errors.Is(err, assetlib.ErrLabelTaken) {
		t.Fatalf("labels are unique per kind, ignoring case: %v", err)
	}
	if _, err := store.Create(ctx, assetlib.Asset{UserID: user, Kind: assetlib.KindProduct, Label: "Ada", MediaID: image.ID}); err != nil {
		t.Fatalf("the same label may name another kind: %v", err)
	}
	if _, err := store.Create(ctx, assetlib.Asset{UserID: user, Kind: assetlib.KindMusic, Label: "Morning loop", MediaID: image.ID}); err != nil {
		t.Fatalf("music is a kind the table accepts: %v", err)
	}
	if _, err := store.Get(ctx, other, face.ID); !errors.Is(err, assetlib.ErrNotFound) {
		t.Fatalf("another user's asset is invisible: %v", err)
	}
	if got, err := store.Relabel(ctx, user, face.ID, "Ada front"); err != nil || got.Label != "Ada front" {
		t.Fatalf("relabel: %+v %v", got, err)
	}
	if got, err := store.Consent(ctx, user, face.ID); err != nil || got.ConsentAt == nil {
		t.Fatalf("consent: %+v %v", got, err)
	}
	list, err := store.List(ctx, user)
	if err != nil || len(list) != 3 {
		t.Fatalf("list: %+v %v", list, err)
	}
	if err := store.Delete(ctx, other, face.ID); !errors.Is(err, assetlib.ErrNotFound) {
		t.Fatalf("another user cannot delete: %v", err)
	}
	if err := store.Delete(ctx, user, face.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
}

// The migration copies files out of existing groups. It runs once on an empty
// schema in tests, so its copy step is replayed here against a seeded group.
func TestAssetGroupsAreCopiedIntoTheLibrary(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	user := uuid.NewString()
	if _, err := NewProfileStore(pool).Ensure(ctx, user, "c@example.com", "C"); err != nil {
		t.Fatal(err)
	}
	groups := NewAssetStore(pool)
	group, err := groups.Create(ctx, user, "avatar001")
	if err != nil {
		t.Fatal(err)
	}
	face, voice, extra := uuid.NewString(), uuid.NewString(), uuid.NewString()
	if _, err := groups.Update(ctx, user, group.ID, group.Name, assets.Slots{Face: face, Voice: voice}, []assets.Extra{{ID: extra, Label: "Logo"}}); err != nil {
		t.Fatal(err)
	}
	if _, err := groups.Consent(ctx, user, group.ID, "face"); err != nil {
		t.Fatal(err)
	}

	sql, err := migrations.FS.ReadFile("041_library_assets.sql")
	if err != nil {
		t.Fatal(err)
	}
	copyStep := string(sql)[strings.Index(string(sql), "-- Every file already"):]
	for range 2 {
		if _, err := pool.Exec(ctx, copyStep); err != nil {
			t.Fatalf("copy step (it must also be safe to repeat): %v", err)
		}
	}

	list, err := NewAssetLibraryStore(pool).List(ctx, user)
	if err != nil || len(list) != 3 {
		t.Fatalf("copied: %+v %v", list, err)
	}
	byKind := map[assetlib.Kind]assetlib.Asset{}
	for _, a := range list {
		byKind[a.Kind] = a
	}
	if byKind[assetlib.KindFace].MediaID != face || byKind[assetlib.KindFace].ConsentAt == nil || byKind[assetlib.KindFace].Label != "avatar001" {
		t.Fatalf("face: %+v", byKind[assetlib.KindFace])
	}
	if byKind[assetlib.KindVoice].ConsentAt != nil {
		t.Fatalf("voice consent was never given: %+v", byKind[assetlib.KindVoice])
	}
	if byKind[assetlib.KindOther].Label != "Logo" || byKind[assetlib.KindOther].MediaID != extra {
		t.Fatalf("extra: %+v", byKind[assetlib.KindOther])
	}
}
