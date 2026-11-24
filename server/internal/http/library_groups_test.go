package httpserver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/assetlib"
	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
)

type fakeLibraryGroups struct{ assigned []string }

func (f *fakeLibraryGroups) ListGroups(context.Context, string) ([]assetlib.Group, error) {
	return []assetlib.Group{{ID: "g1", Name: "Ada"}}, nil
}
func (f *fakeLibraryGroups) CreateGroup(_ context.Context, _, name string) (assetlib.Group, error) {
	if name == "Ada" {
		return assetlib.Group{}, assetlib.ErrGroupNameTaken
	}
	return assetlib.Group{ID: "g2", Name: name}, nil
}
func (f *fakeLibraryGroups) RenameGroup(_ context.Context, _, id, name string) (assetlib.Group, error) {
	return assetlib.Group{ID: id, Name: name}, nil
}
func (f *fakeLibraryGroups) DeleteGroup(context.Context, string, string) error {
	return assetlib.ErrGroupNotFound
}
func (f *fakeLibraryGroups) Assign(_ context.Context, userID, assetID, groupID string) (assetlib.Asset, error) {
	f.assigned = append(f.assigned, userID+"/"+assetID+"/"+groupID)
	return assetlib.Asset{ID: assetID}, nil
}

func groupRequest(t *testing.T, app *App, handler func(http.ResponseWriter, *http.Request), method, path, id, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if id != "" {
		req.SetPathValue("id", id)
	}
	req = req.WithContext(auth.WithIdentity(req.Context(), auth.Identity{UserID: "u1"}))
	res := httptest.NewRecorder()
	handler(res, req)
	return res
}

func TestLibraryGroupRoutes(t *testing.T) {
	f := &fakeLibraryGroups{}
	app := &App{deps: Deps{LibraryGroups: f}}
	const asset = "8b6f6c1e-3f5a-4a39-9d55-2a7d5a0e6a11"
	const group = "1f0e4a2c-6b0d-4d8e-9a55-0c7d5a0e6a22"

	if res := groupRequest(t, app, app.listLibraryGroups, "GET", "/api/v1/assets/groups", "", ""); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"Ada"`) {
		t.Fatalf("list: %d %s", res.Code, res.Body)
	}
	if res := groupRequest(t, app, app.createLibraryGroup, "POST", "/api/v1/assets/groups", "", `{"name":"Ada"}`); res.Code != http.StatusConflict {
		t.Fatalf("taken name: %d", res.Code)
	}
	if res := groupRequest(t, app, app.deleteLibraryGroup, "DELETE", "/x", group, ""); res.Code != http.StatusNotFound {
		t.Fatalf("missing group: %d", res.Code)
	}
	if res := groupRequest(t, app, app.assignLibraryGroup, "PUT", "/x", asset, `{"group_id":"not-a-uuid"}`); res.Code != http.StatusBadRequest {
		t.Fatalf("bad group id: %d", res.Code)
	}
	if res := groupRequest(t, app, app.assignLibraryGroup, "PUT", "/x", asset, `{"group_id":"`+group+`"}`); res.Code != http.StatusOK || f.assigned[0] != "u1/"+asset+"/"+group {
		t.Fatalf("assign: %d %v", res.Code, f.assigned)
	}
	if res := groupRequest(t, app, app.assignLibraryGroup, "PUT", "/x", asset, `{"group_id":""}`); res.Code != http.StatusOK || f.assigned[1] != "u1/"+asset+"/" {
		t.Fatalf("ungroup: %d %v", res.Code, f.assigned)
	}

	off := &App{deps: Deps{}}
	if res := groupRequest(t, off, off.listLibraryGroups, "GET", "/api/v1/assets/groups", "", ""); res.Code != http.StatusNotFound {
		t.Fatalf("groups off: %d", res.Code)
	}
}
