package httpserver

import (
	"context"
	"net/http"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
)

const libraryAssetID = "90000000-0000-4000-8000-000000000001"

type fakeAssetLibrary struct{ assets map[string]assetlib.Asset }

func (f *fakeAssetLibrary) List(_ context.Context, userID string) ([]assetlib.Asset, error) {
	out := []assetlib.Asset{}
	for _, a := range f.assets {
		if a.UserID == userID {
			out = append(out, a)
		}
	}
	return out, nil
}

func (f *fakeAssetLibrary) Create(_ context.Context, userID string, kind assetlib.Kind, label, mediaID string) (assetlib.Asset, error) {
	if kind.Accepts() == nil || label == "" {
		return assetlib.Asset{}, assetlib.ErrInvalid
	}
	if label == "Taken" {
		return assetlib.Asset{}, assetlib.ErrLabelTaken
	}
	a := assetlib.Asset{ID: "90000000-0000-4000-8000-000000000002", UserID: userID, Kind: kind, Label: label, MediaID: mediaID}
	f.assets[a.ID] = a
	return a, nil
}

func (f *fakeAssetLibrary) own(userID, id string) (assetlib.Asset, error) {
	a, ok := f.assets[id]
	if !ok || a.UserID != userID {
		return assetlib.Asset{}, assetlib.ErrNotFound
	}
	return a, nil
}

func (f *fakeAssetLibrary) Relabel(_ context.Context, userID, id, label string) (assetlib.Asset, error) {
	a, err := f.own(userID, id)
	a.Label = label
	return a, err
}

func (f *fakeAssetLibrary) Consent(_ context.Context, userID, id string) (assetlib.Asset, error) {
	return f.own(userID, id)
}

func (f *fakeAssetLibrary) Delete(_ context.Context, userID, id string) error {
	if _, err := f.own(userID, id); err != nil {
		return err
	}
	delete(f.assets, id)
	return nil
}

func TestAssetLibraryEndpoints(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.AssetLibrary = &fakeAssetLibrary{assets: map[string]assetlib.Asset{
		libraryAssetID: {ID: libraryAssetID, UserID: alice, Kind: assetlib.KindFace, Label: "Ada"},
	}}
	h.rebuild()
	token := h.token(t, alice)
	media := `"media_id":"a0000000-0000-4000-8000-000000000001"`

	if res := h.get("/api/v1/assets", token); res.Code != http.StatusOK {
		t.Fatalf("list: %d %s", res.Code, res.Body)
	}
	if res := h.get("/api/v1/assets", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
	if res := h.post("/api/v1/assets", token, `{"kind":"voice","label":"Narrator",`+media+`}`); res.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", res.Code, res.Body)
	}
	if res := h.post("/api/v1/assets", token, `{"kind":"voice","label":"Taken",`+media+`}`); res.Code != http.StatusConflict {
		t.Fatalf("taken label: %d", res.Code)
	}
	if res := h.post("/api/v1/assets", token, `{"kind":"mood","label":"X",`+media+`}`); res.Code != http.StatusBadRequest {
		t.Fatalf("unknown kind: %d", res.Code)
	}
	if res := h.post("/api/v1/assets", token, `{"kind":"face","label":"X","media_id":"nope"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("malformed media id: %d", res.Code)
	}
	if res := send(h, http.MethodPatch, "/api/v1/assets/"+libraryAssetID, token, `{"label":"Ada front"}`); res.Code != http.StatusOK {
		t.Fatalf("relabel: %d %s", res.Code, res.Body)
	}
	if res := h.post("/api/v1/assets/"+libraryAssetID+"/consent", h.token(t, bob), ``); res.Code != http.StatusNotFound {
		t.Fatalf("another user's asset: %d", res.Code)
	}
	if res := h.post("/api/v1/assets/"+libraryAssetID+"/consent", token, ``); res.Code != http.StatusOK {
		t.Fatalf("consent: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodDelete, "/api/v1/assets/"+libraryAssetID, token, ``); res.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/assets/not-a-uuid", token, ``); res.Code != http.StatusBadRequest {
		t.Fatalf("malformed id: %d", res.Code)
	}
}
