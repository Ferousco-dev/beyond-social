package httpserver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
)

type fakeAdminProfileStore struct {
	rows map[string]bool
}

func (f *fakeAdminProfileStore) SetSuspended(_ context.Context, userID string, suspended bool) (bool, error) {
	if _, ok := f.rows[userID]; !ok {
		return false, nil
	}
	f.rows[userID] = suspended
	return true, nil
}

type fakeAdminUserDetailReader struct{ detail credits.UserDetail }

func (f fakeAdminUserDetailReader) UserDetail(context.Context, string) (credits.UserDetail, error) {
	return f.detail, nil
}

func TestAdminCanReadUserDetails(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.profiles.rows[alice] = accounts.Profile{ID: alice, Role: accounts.RoleAdmin}
	h.profiles.rows[bob] = accounts.Profile{ID: bob, Role: accounts.RoleUser}
	h.deps.AdminUserDetails = fakeAdminUserDetailReader{detail: credits.UserDetail{
		ID: bob, Email: "bob@example.com", Name: "Bob", Role: "user",
		AccountStatus: "suspended", Plan: "Pro", SubscriptionStatus: "active", CreditBalance: 25,
	}}
	h.rebuild()

	if res := h.get("/api/v1/admin/users/"+bob, h.token(t, alice)); res.Code != http.StatusOK ||
		!strings.Contains(res.Body.String(), `"accountStatus":"suspended"`) ||
		!strings.Contains(res.Body.String(), `"plan":"Pro"`) {
		t.Fatalf("admin detail: %d %s", res.Code, res.Body)
	}
	if res := h.get("/api/v1/admin/users/"+bob, h.token(t, bob)); res.Code != http.StatusNotFound {
		t.Fatalf("non-admin detail: %d %s", res.Code, res.Body)
	}
	if res := h.get("/api/v1/admin/users/not-a-uuid", h.token(t, alice)); res.Code != http.StatusBadRequest {
		t.Fatalf("malformed user id: %d %s", res.Code, res.Body)
	}
}

func TestAdminUserSuspension(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.profiles.rows[alice] = accounts.Profile{ID: alice, Role: accounts.RoleAdmin}
	h.profiles.rows[bob] = accounts.Profile{ID: bob, Role: accounts.RoleUser}
	store := &fakeAdminProfileStore{rows: map[string]bool{alice: false, bob: false}}
	h.deps.AdminProfiles = store
	h.rebuild()

	request := func(actorID, targetID, body string) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/"+targetID+"/suspension", strings.NewReader(body))
		if actorID != "" {
			req.Header.Set("Authorization", "Bearer "+h.token(t, actorID))
		}
		res := httptest.NewRecorder()
		h.handler.ServeHTTP(res, req)
		return res
	}

	if res := request(bob, bob, `{"suspended":true}`); res.Code != http.StatusNotFound {
		t.Fatalf("non-admin: %d %s", res.Code, res.Body)
	}
	if res := request(alice, alice, `{"suspended":true}`); res.Code != http.StatusConflict {
		t.Fatalf("self-suspend: %d %s", res.Code, res.Body)
	}
	if res := request(alice, strings.ToUpper(alice), `{"suspended":true}`); res.Code != http.StatusConflict {
		t.Fatalf("uppercase self-suspend: %d %s", res.Code, res.Body)
	}
	if res := request(alice, bob, `{}`); res.Code != http.StatusBadRequest {
		t.Fatalf("missing state: %d %s", res.Code, res.Body)
	}

	path := "/api/v1/admin/users/" + bob + "/suspension"
	for _, tc := range []struct {
		body      string
		suspended bool
	}{
		{body: `{"suspended":true}`, suspended: true},
		{body: `{"suspended":false}`, suspended: false},
	} {
		req := httptest.NewRequest(http.MethodPut, path, strings.NewReader(tc.body))
		req.Header.Set("Authorization", "Bearer "+h.token(t, alice))
		res := httptest.NewRecorder()
		h.handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK || store.rows[bob] != tc.suspended {
			t.Fatalf("set %v: code=%d state=%v body=%s", tc.suspended, res.Code, store.rows[bob], res.Body)
		}
	}
}
