package httpserver

import (
	"context"
	"net/http"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/assets"
)

type fakeAssetGroups struct {
	groups map[string]assets.Group
}

func newFakeAssetGroups() *fakeAssetGroups {
	return &fakeAssetGroups{groups: map[string]assets.Group{
		"80000000-0000-4000-8000-000000000001": {ID: "80000000-0000-4000-8000-000000000001", UserID: alice, Name: "avatar001"},
	}}
}

func (f *fakeAssetGroups) List(_ context.Context, userID string) ([]assets.Group, error) {
	var out []assets.Group
	for _, group := range f.groups {
		if group.UserID == userID {
			out = append(out, group)
		}
	}
	return out, nil
}

func (f *fakeAssetGroups) Create(_ context.Context, userID, name string) (assets.Group, error) {
	if name == "" {
		name = "avatar002"
	}
	group := assets.Group{ID: "80000000-0000-4000-8000-000000000002", UserID: userID, Name: name}
	f.groups[group.ID] = group
	return group, nil
}

func (f *fakeAssetGroups) Detail(_ context.Context, userID, id string) (assets.GroupDetail, error) {
	group, ok := f.groups[id]
	if !ok || group.UserID != userID {
		return assets.GroupDetail{}, assets.ErrNotFound
	}
	return assets.GroupDetail{Group: group}, nil
}

func (f *fakeAssetGroups) Set(_ context.Context, userID, id string, slots assets.Slots, extras []assets.Extra) (assets.Group, error) {
	group, ok := f.groups[id]
	if !ok || group.UserID != userID {
		return assets.Group{}, assets.ErrNotFound
	}
	group.Slots, group.Extras = slots, extras
	f.groups[id] = group
	return group, nil
}

func (f *fakeAssetGroups) Rename(_ context.Context, userID, id, name string) (assets.Group, error) {
	group, ok := f.groups[id]
	if !ok || group.UserID != userID {
		return assets.Group{}, assets.ErrNotFound
	}
	if name == "" {
		return assets.Group{}, assets.ErrInvalid
	}
	group.Name = name
	f.groups[id] = group
	return group, nil
}

func (f *fakeAssetGroups) Consent(_ context.Context, userID, id, kind string) (assets.Group, error) {
	group, ok := f.groups[id]
	if !ok || group.UserID != userID {
		return assets.Group{}, assets.ErrNotFound
	}
	if kind != "face" && kind != "voice" {
		return assets.Group{}, assets.ErrInvalid
	}
	return group, nil
}

func (f *fakeAssetGroups) Delete(_ context.Context, userID, id string) error {
	group, ok := f.groups[id]
	if !ok || group.UserID != userID {
		return assets.ErrNotFound
	}
	delete(f.groups, id)
	return nil
}

func assetHarness(t *testing.T) *harness {
	t.Helper()
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.AssetGroups = newFakeAssetGroups()
	h.rebuild()
	return h
}

func TestAssetGroupEndpoints(t *testing.T) {
	h := assetHarness(t)
	token := h.token(t, alice)
	id := "80000000-0000-4000-8000-000000000001"

	if res := h.get("/api/v1/asset-groups", token); res.Code != http.StatusOK {
		t.Fatalf("list: %d %s", res.Code, res.Body)
	}
	if res := h.get("/api/v1/asset-groups", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
	created := h.post("/api/v1/asset-groups", token, `{"name":"Summer"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", created.Code, created.Body)
	}
	detail := h.get("/api/v1/asset-groups/"+id, token)
	if detail.Code != http.StatusOK {
		t.Fatalf("detail: %d %s", detail.Code, detail.Body)
	}
	if res := h.get("/api/v1/asset-groups/"+id, h.token(t, bob)); res.Code != http.StatusNotFound {
		t.Fatalf("another user's group: %d", res.Code)
	}

	updated := send(h, http.MethodPut, "/api/v1/asset-groups/"+id, token,
		`{"name":"Summer launch","slots":{"face":"m1","voice":"","product":"","environment":""},"extras":[]}`)
	if updated.Code != http.StatusOK {
		t.Fatalf("update: %d %s", updated.Code, updated.Body)
	}
	consent := h.post("/api/v1/asset-groups/"+id+"/consent", token, `{"kind":"face"}`)
	if consent.Code != http.StatusOK {
		t.Fatalf("consent: %d %s", consent.Code, consent.Body)
	}
	if res := h.post("/api/v1/asset-groups/"+id+"/consent", token, `{"kind":"mood"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("bad consent kind: %d", res.Code)
	}
	deleted := send(h, http.MethodDelete, "/api/v1/asset-groups/"+id, token, ``)
	if deleted.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", deleted.Code)
	}
	if res := h.get("/api/v1/asset-groups/not-a-uuid", token); res.Code != http.StatusBadRequest {
		t.Fatalf("malformed id: %d", res.Code)
	}
}
