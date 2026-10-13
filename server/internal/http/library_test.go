package httpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/library"
)

type fakeLibrary struct{ hidden string }

func (f *fakeLibrary) List(context.Context, string, int, int) ([]library.Item, error) {
	return []library.Item{{ID: postID, Type: "video_generate", VideoURL: "https://cdn.example/a.mp4"}}, nil
}
func (f *fakeLibrary) Video(_ context.Context, user, id string) (library.Item, error) {
	if user != alice {
		return library.Item{}, library.ErrNotFound
	}
	return library.Item{ID: id, VideoURL: "https://cdn.example/a.mp4"}, nil
}
func (f *fakeLibrary) Hide(_ context.Context, user, id string) error {
	if user != alice {
		return library.ErrNotFound
	}
	f.hidden = id
	return nil
}

func TestLibraryEndpoints(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	fake := &fakeLibrary{}
	h.deps.Library = fake
	h.deps.Media = fakeMedia{}
	h.rebuild()
	a, b := h.token(t, alice), h.token(t, bob)

	if res := send(h, http.MethodGet, "/api/v1/library", a, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "a.mp4") {
		t.Fatalf("list: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodGet, "/api/v1/library", "", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/library/"+postID+"/adopt", a, ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), postID) {
		t.Fatalf("adopt: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPost, "/api/v1/library/"+postID+"/adopt", b, ""); res.Code != http.StatusNotFound {
		t.Fatalf("adopt a stranger's video: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/library/not-a-uuid", a, ""); res.Code != http.StatusBadRequest {
		t.Fatalf("bad id: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/library/"+postID, b, ""); res.Code != http.StatusNotFound {
		t.Fatalf("stranger: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/library/"+postID, a, ""); res.Code != http.StatusNoContent || fake.hidden != postID {
		t.Fatalf("delete: %d", res.Code)
	}
}
