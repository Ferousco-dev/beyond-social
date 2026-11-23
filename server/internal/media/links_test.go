package media

import (
	"context"
	"errors"
	"math"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/storage"
)

// rangeStorage serves one file's bytes through ranged reads.
type rangeStorage struct {
	fakeStorage
	file []byte
}

func (r rangeStorage) ReadRange(_ context.Context, _, _ string, off, n int64) ([]byte, error) {
	if off >= int64(len(r.file)) {
		return []byte{}, nil
	}
	end := off + n
	if end > int64(len(r.file)) {
		end = int64(len(r.file))
	}
	return r.file[off:end], nil
}

// clip is an MP4 whose header says it plays for 9 seconds.
func clip() []byte {
	ftyp := append([]byte{0, 0, 0, 16}, []byte("ftypisom\x00\x00\x00\x00")...)
	mvhd := make([]byte, 108)
	copy(mvhd, []byte{0, 0, 0, 108})
	copy(mvhd[4:], "mvhd")
	copy(mvhd[8+12:], []byte{0, 0, 0x03, 0xE8}) // timescale 1000
	copy(mvhd[8+16:], []byte{0, 0, 0x23, 0x28}) // 9000
	moov := append([]byte{0, 0, 0, byte(8 + len(mvhd))}, []byte("moov")...)
	return append(append(ftyp, moov...), mvhd...)
}

func uploaded(t *testing.T, st Storage, name, mime string, size int64) (*Service, string) {
	t.Helper()
	ctx := context.Background()
	svc := NewService(&memStore{items: map[string]Item{}}, st, fakeFetcher{})
	slot, err := svc.RequestUpload(ctx, "u1", name, mime, size)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Confirm(ctx, "u1", slot.ID); err != nil {
		t.Fatal(err)
	}
	return svc, slot.ID
}

func TestVideoLinkMeasuresTheClipAndRefusesStrangers(t *testing.T) {
	file := clip()
	st := rangeStorage{fakeStorage: fakeStorage{stat: storage.Info{Size: int64(len(file))}}, file: file}
	svc, id := uploaded(t, st, "me.mp4", "video/mp4", int64(len(file)))
	src, err := svc.VideoLink(context.Background(), "u1", id)
	if err != nil || math.Abs(src.Seconds-9) > 1e-9 || src.URL == "" {
		t.Fatalf("got %+v %v", src, err)
	}
	if _, err := svc.VideoLink(context.Background(), "u2", id); !errors.Is(err, ErrNotFound) {
		t.Fatalf("a stranger got a link: %v", err)
	}
}

func TestVideoLinkRefusesAPageNamedAsAVideo(t *testing.T) {
	file := []byte("<!doctype html><html>not a video at all</html>")
	st := rangeStorage{fakeStorage: fakeStorage{stat: storage.Info{Size: int64(len(file))}}, file: file}
	svc, id := uploaded(t, st, "me.mp4", "video/mp4", int64(len(file)))
	if _, err := svc.VideoLink(context.Background(), "u1", id); !errors.Is(err, ErrUnsupported) {
		t.Fatalf("expected ErrUnsupported, got %v", err)
	}
}

func TestPictureLinksRefusesWebPAndChecksBytes(t *testing.T) {
	png := []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR")
	st := rangeStorage{fakeStorage: fakeStorage{stat: storage.Info{Size: int64(len(png))}}, file: png}
	svc, id := uploaded(t, st, "suit.png", "image/png", int64(len(png)))
	links, err := svc.PictureLinks(context.Background(), "u1", []string{id})
	if err != nil || len(links) != 1 {
		t.Fatalf("got %v %v", links, err)
	}
	svc, webp := uploaded(t, st, "suit.webp", "image/webp", int64(len(png)))
	if _, err := svc.PictureLinks(context.Background(), "u1", []string{webp}); !errors.Is(err, ErrUnsupported) {
		t.Fatalf("webp: %v", err)
	}
	page := []byte("<html><body>hello</body></html>")
	st = rangeStorage{fakeStorage: fakeStorage{stat: storage.Info{Size: int64(len(page))}}, file: page}
	svc, fake := uploaded(t, st, "suit.png", "image/png", int64(len(page)))
	if _, err := svc.PictureLinks(context.Background(), "u1", []string{fake}); !errors.Is(err, ErrUnsupported) {
		t.Fatalf("a page named as a picture: %v", err)
	}
}
