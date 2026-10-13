package httpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/media"
)

type fakeMedia struct{}

func (fakeMedia) RequestUpload(_ context.Context, user, name, mime string, size int64) (media.Slot, error) {
	if mime != "image/png" {
		return media.Slot{}, media.ErrUnsupported
	}
	if size > 100 {
		return media.Slot{}, media.ErrTooLarge
	}
	return media.Slot{ID: "10000000-0000-4000-8000-000000000001", Path: user + "/x.png", Token: "tok"}, nil
}
func (fakeMedia) Confirm(_ context.Context, user, id string) (media.Descriptor, error) {
	if user != alice {
		return media.Descriptor{}, media.ErrNotFound
	}
	return media.Descriptor{ID: id, Kind: media.KindImage, Name: "x.png"}, nil
}
func (fakeMedia) ViewURL(_ context.Context, user, id string) (string, error) {
	if user != alice {
		return "", media.ErrNotFound
	}
	return "https://files.example/" + id, nil
}

func TestAttachmentEndpoints(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.Media = fakeMedia{}
	h.rebuild()
	a, b := h.token(t, alice), h.token(t, bob)
	id := "10000000-0000-4000-8000-000000000001"

	res := send(h, http.MethodPost, "/api/v1/media", a, `{"name":"x.png","mime_type":"image/png","size_bytes":50}`)
	if res.Code != http.StatusCreated || !strings.Contains(res.Body.String(), `"token":"tok"`) {
		t.Fatalf("slot: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/media", a, `{"name":"x.exe","mime_type":"application/x-msdownload","size_bytes":5}`); res.Code != http.StatusUnsupportedMediaType {
		t.Fatalf("unsupported: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/media", a, `{"name":"x.png","mime_type":"image/png","size_bytes":5000}`); res.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("too large: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/media/"+id+"/confirm", a, ""); res.Code != http.StatusOK {
		t.Fatalf("confirm: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/media/"+id+"/confirm", b, ""); res.Code != http.StatusNotFound {
		t.Fatalf("a stranger confirmed: %d", res.Code)
	}
	if res := send(h, http.MethodGet, "/api/v1/media/"+id+"/url", b, ""); res.Code != http.StatusNotFound {
		t.Fatalf("a stranger got a link: %d", res.Code)
	}
	if res := send(h, http.MethodGet, "/api/v1/media/"+id+"/url", a, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "files.example") {
		t.Fatalf("view: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodGet, "/api/v1/media/nope/url", a, ""); res.Code != http.StatusNotFound {
		t.Fatalf("malformed id: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/media", "", `{}`); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
}
