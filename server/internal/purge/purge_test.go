package purge

import (
	"context"
	"errors"
	"testing"
)

type memStore struct {
	pending []string
	paths   Paths
	erased  []string
}

func (m *memStore) Pending(context.Context, int) ([]string, error) { return m.pending, nil }
func (m *memStore) Paths(context.Context, string) (Paths, error)   { return m.paths, nil }
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

func TestPurgeRemovesFilesThenRows(t *testing.T) {
	store := &memStore{paths: Paths{Media: []string{"u/m1.mp4"}, Footage: []string{"u/twin.mp4"}}}
	files := &memFiles{}
	if err := New(store, files, "user-media", "avatars").Purge(context.Background(), "u1"); err != nil {
		t.Fatal(err)
	}
	if len(files.deleted) != 2 || files.deleted[0] != "user-media/u/m1.mp4" || files.deleted[1] != "avatars/u/twin.mp4" || len(store.erased) != 1 {
		t.Fatalf("files=%v erased=%v", files.deleted, store.erased)
	}
}

func TestAnythingThatCannotBeRemovedKeepsTheRowsSoItIsRetried(t *testing.T) {
	ctx := context.Background()
	store := &memStore{paths: Paths{Media: []string{"u/m1.mp4", "u/m2.mp4"}}}
	files := &memFiles{failOn: "u/m1.mp4"}
	if err := New(store, files, "user-media", "avatars").Purge(ctx, "u1"); err == nil || len(store.erased) != 0 {
		t.Fatalf("a failed file delete still erased the rows: %v erased=%v", err, store.erased)
	}
}

func TestTheJobFindsAccountsThatWereMissed(t *testing.T) {
	store := &memStore{pending: []string{"u1", "u2"}}
	p := New(store, &memFiles{}, "m", "f")
	p.once(context.Background())
	if len(store.erased) != 2 {
		t.Fatalf("erased = %v", store.erased)
	}
}
