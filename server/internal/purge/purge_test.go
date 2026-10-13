package purge

import (
	"context"
	"errors"
	"testing"
)

type memStore struct {
	pending []string
	avatars []string
	paths   Paths
	erased  []string
}

func (m *memStore) Pending(context.Context, int) ([]string, error) { return m.pending, nil }
func (m *memStore) Paths(context.Context, string) (Paths, error)   { return m.paths, nil }
func (m *memStore) AvatarIDs(context.Context, string) ([]string, error) {
	return m.avatars, nil
}
func (m *memStore) Erase(_ context.Context, id string) error {
	m.erased = append(m.erased, id)
	return nil
}

type memFiles struct {
	deleted []string
	failOn  string
}

func (f *memFiles) Delete(_ context.Context, bucket, path string) error {
	if path == f.failOn {
		return errors.New("storage is down")
	}
	f.deleted = append(f.deleted, bucket+"/"+path)
	return nil
}

type memAvatars struct {
	deleted []string
	err     error
}

func (a *memAvatars) Delete(_ context.Context, _, id string) error {
	if a.err != nil {
		return a.err
	}
	a.deleted = append(a.deleted, id)
	return nil
}

func TestPurgeRemovesAvatarsThenFilesThenRows(t *testing.T) {
	store := &memStore{avatars: []string{"a1"}, paths: Paths{Media: []string{"u/m1.mp4"}, Footage: []string{"u/twin.mp4"}}}
	files, avatars := &memFiles{}, &memAvatars{}
	if err := New(store, files, avatars, "user-media", "avatars").Purge(context.Background(), "u1"); err != nil {
		t.Fatal(err)
	}
	if len(avatars.deleted) != 1 || len(files.deleted) != 2 || files.deleted[0] != "user-media/u/m1.mp4" || files.deleted[1] != "avatars/u/twin.mp4" || len(store.erased) != 1 {
		t.Fatalf("avatars=%v files=%v erased=%v", avatars.deleted, files.deleted, store.erased)
	}
}

func TestAnythingThatCannotBeRemovedKeepsTheRowsSoItIsRetried(t *testing.T) {
	ctx := context.Background()
	store := &memStore{avatars: []string{"a1"}, paths: Paths{Media: []string{"u/m1.mp4", "u/m2.mp4"}}}
	files := &memFiles{failOn: "u/m1.mp4"}
	if err := New(store, files, &memAvatars{}, "user-media", "avatars").Purge(ctx, "u1"); err == nil || len(store.erased) != 0 {
		t.Fatalf("a failed file delete still erased the rows: %v erased=%v", err, store.erased)
	}
	// The avatar at HeyGen refusing stops everything before any file is touched.
	files = &memFiles{}
	store = &memStore{avatars: []string{"a1"}, paths: Paths{Media: []string{"u/m1.mp4"}}}
	if err := New(store, files, &memAvatars{err: errors.New("heygen refused")}, "user-media", "avatars").Purge(ctx, "u1"); err == nil || len(files.deleted) != 0 || len(store.erased) != 0 {
		t.Fatalf("a refused avatar delete went on: %v files=%v", err, files.deleted)
	}
}

func TestTheJobFindsAccountsThatWereMissed(t *testing.T) {
	store := &memStore{pending: []string{"u1", "u2"}}
	p := New(store, &memFiles{}, &memAvatars{}, "m", "f")
	p.once(context.Background())
	if len(store.erased) != 2 {
		t.Fatalf("erased = %v", store.erased)
	}
}
