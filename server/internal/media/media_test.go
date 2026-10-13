package media

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/storage"
)

type memStore struct{ items map[string]Item }

func (m *memStore) Create(_ context.Context, i Item) (Item, error) { m.items[i.ID] = i; return i, nil }
func (m *memStore) Get(_ context.Context, userID, id string) (Item, error) {
	i, ok := m.items[id]
	if !ok || i.UserID != userID {
		return Item{}, ErrNotFound
	}
	return i, nil
}
func (m *memStore) MarkReady(_ context.Context, id string, size int64) error {
	i := m.items[id]
	i.Ready, i.Size = true, size
	m.items[id] = i
	return nil
}

type fakeStorage struct {
	stat storage.Info
	err  error
}

func (f fakeStorage) SignedUploadToken(_ context.Context, _, p string) (string, error) {
	return "tok-" + p, nil
}
func (f fakeStorage) Stat(context.Context, string, string) (storage.Info, error) {
	return f.stat, f.err
}
func (f fakeStorage) SignedURL(_ context.Context, _, p string, _ time.Duration) (string, error) {
	return "https://files.example/" + p, nil
}

type fakeFetcher struct{ data []byte }

func (f fakeFetcher) Fetch(context.Context, string, int64) ([]byte, error) { return f.data, nil }

func newSvc(info storage.Info, err error) (*Service, *memStore) {
	st := &memStore{items: map[string]Item{}}
	return NewService(st, fakeStorage{stat: info, err: err}, fakeFetcher{data: []byte("bytes")}), st
}

func TestRequestUploadChoosesThePathAndChecksTypeAndSize(t *testing.T) {
	svc, st := newSvc(storage.Info{}, nil)
	ctx := context.Background()
	slot, err := svc.RequestUpload(ctx, "u1", `C:\fakepath\My Photo.JPG`, "image/JPEG", 2<<20)
	if err != nil || !strings.HasPrefix(slot.Path, "u1/") || !strings.HasSuffix(slot.Path, ".jpg") || slot.Token == "" {
		t.Fatalf("slot = %+v err=%v", slot, err)
	}
	if got := st.items[slot.ID]; got.Name != "My Photo.JPG" || got.Kind != KindImage || got.Ready {
		t.Fatalf("stored = %+v", got)
	}
	for name, tc := range map[string]struct {
		mime string
		size int64
		want error
	}{
		"gif is not allowed":    {"image/gif", 1000, ErrUnsupported},
		"script is not allowed": {"text/html", 1000, ErrUnsupported},
		"picture too big":       {"image/png", 11 << 20, ErrTooLarge},
		"audio too big":         {"audio/mpeg", 26 << 20, ErrTooLarge},
		"video too big":         {"video/mp4", 101 << 20, ErrTooLarge},
		"empty":                 {"image/png", 0, ErrTooLarge},
	} {
		if _, err := svc.RequestUpload(ctx, "u1", "x", tc.mime, tc.size); !errors.Is(err, tc.want) {
			t.Errorf("%s: err = %v", name, err)
		}
	}
	if _, err := svc.RequestUpload(ctx, "u1", "  ", "image/png", 100); !errors.Is(err, ErrInvalid) {
		t.Errorf("blank name err = %v", err)
	}
}

func TestConfirmNeedsTheObjectInStorageAndWithinTheLimit(t *testing.T) {
	ctx := context.Background()
	svc, st := newSvc(storage.Info{Size: 1234}, nil)
	slot, _ := svc.RequestUpload(ctx, "u1", "a.png", "image/png", 2000)
	d, err := svc.Confirm(ctx, "u1", slot.ID)
	if err != nil || d.Size != 1234 || !st.items[slot.ID].Ready {
		t.Fatalf("confirm = %+v err=%v", d, err)
	}
	if _, err := svc.Confirm(ctx, "u2", slot.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("a stranger confirmed it: %v", err)
	}

	missing, _ := newSvc(storage.Info{}, storage.ErrNotFound)
	slot, _ = missing.RequestUpload(ctx, "u1", "a.png", "image/png", 2000)
	if _, err := missing.Confirm(ctx, "u1", slot.ID); !errors.Is(err, ErrNotUploaded) {
		t.Fatalf("not uploaded err = %v", err)
	}

	big, _ := newSvc(storage.Info{Size: 50 << 20}, nil)
	slot, _ = big.RequestUpload(ctx, "u1", "a.png", "image/png", 2000)
	if _, err := big.Confirm(ctx, "u1", slot.ID); !errors.Is(err, ErrTooLarge) {
		t.Fatalf("a file larger than allowed was confirmed: %v", err)
	}
}

func TestResolveOnlyReturnsYourOwnFinishedFilesOnce(t *testing.T) {
	ctx := context.Background()
	svc, _ := newSvc(storage.Info{Size: 10}, nil)
	a, _ := svc.RequestUpload(ctx, "u1", "a.png", "image/png", 10)
	b, _ := svc.RequestUpload(ctx, "u1", "b.png", "image/png", 10)
	if _, err := svc.Resolve(ctx, "u1", []string{a.ID}); !errors.Is(err, ErrNotUploaded) {
		t.Fatalf("an unfinished upload was usable: %v", err)
	}
	_, _ = svc.Confirm(ctx, "u1", a.ID)
	_, _ = svc.Confirm(ctx, "u1", b.ID)
	if items, err := svc.Resolve(ctx, "u1", []string{a.ID, b.ID}); err != nil || len(items) != 2 || items[0].ID != a.ID {
		t.Fatalf("items = %+v err=%v", items, err)
	}
	if _, err := svc.Resolve(ctx, "u2", []string{a.ID}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("someone else's file: %v", err)
	}
	if _, err := svc.Resolve(ctx, "u1", []string{a.ID, a.ID}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("a repeated id: %v", err)
	}
	if _, err := svc.Resolve(ctx, "u1", []string{"1", "2", "3", "4", "5"}); !errors.Is(err, ErrInvalid) {
		t.Fatalf("too many: %v", err)
	}
}

func TestLoadRefusesTooLargeAndStrangers(t *testing.T) {
	ctx := context.Background()
	svc, _ := newSvc(storage.Info{Size: 5 << 20}, nil)
	slot, _ := svc.RequestUpload(ctx, "u1", "a.mp4", "video/mp4", 5<<20)
	_, _ = svc.Confirm(ctx, "u1", slot.ID)
	if data, mime, err := svc.Load(ctx, "u1", slot.ID, 18<<20); err != nil || mime != "video/mp4" || string(data) != "bytes" {
		t.Fatalf("load = %q %q %v", data, mime, err)
	}
	if _, _, err := svc.Load(ctx, "u1", slot.ID, 1<<20); !errors.Is(err, ErrTooLarge) {
		t.Fatalf("limit not enforced: %v", err)
	}
	if _, _, err := svc.Load(ctx, "u2", slot.ID, 18<<20); !errors.Is(err, ErrNotFound) {
		t.Fatalf("a stranger loaded it: %v", err)
	}
}
