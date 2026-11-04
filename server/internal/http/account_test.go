package httpserver

import (
	"context"
	"github.com/Ferousco-dev/beyond-social/server/internal/credits"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
)

type fakeProfiles struct {
	rows  map[string]accounts.Profile
	calls int
}

func (f *fakeProfiles) Ensure(_ context.Context, id, email, name string) (accounts.Profile, error) {
	f.calls++
	if p, ok := f.rows[id]; ok {
		return p, nil
	}
	p := accounts.Profile{ID: id, Email: email, DisplayName: name, Role: accounts.RoleUser, CreatedAt: time.Now()}
	f.rows[id] = p
	return p, nil
}

func (f *fakeProfiles) MarkGranted(context.Context, string) error { return nil }
func (f *fakeProfiles) SetDisplayName(_ context.Context, id, name string) (accounts.Profile, error) {
	p := f.rows[id]
	p.ID, p.DisplayName = id, name
	f.rows[id] = p
	return p, nil
}
func (f *fakeProfiles) MarkDeleted(_ context.Context, id string) error {
	p := f.rows[id]
	now := time.Now()
	p.DeletedAt = &now
	f.rows[id] = p
	return nil
}

func TestMeCreatesTheProfileOnFirstUseAndReturnsIt(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	res := h.get("/api/v1/me", h.token(t, alice))
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"credits":0`) || !strings.Contains(res.Body.String(), `"role":"user"`) {
		t.Fatalf("%d %s", res.Code, res.Body)
	}
	if _, ok := h.profiles.rows[alice]; !ok {
		t.Fatal("the profile should have been created on first sight")
	}
}

func TestSuspendedAndDeletedAccountsAreRefusedEverywhere(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	now := time.Now()
	h.profiles.rows[alice] = accounts.Profile{ID: alice, SuspendedAt: &now}
	h.profiles.rows[bob] = accounts.Profile{ID: bob, DeletedAt: &now}

	for _, path := range []string{"/api/v1/me", "/api/v1/jobs", "/api/v1/assets", "/api/v1/conversations"} {
		if res := h.get(path, h.token(t, alice)); res.Code != http.StatusForbidden || !strings.Contains(res.Body.String(), "account_suspended") {
			t.Errorf("%s suspended: %d %s", path, res.Code, res.Body)
		}
		if res := h.get(path, h.token(t, bob)); res.Code != http.StatusForbidden || !strings.Contains(res.Body.String(), "account_deleted") {
			t.Errorf("%s deleted: %d %s", path, res.Code, res.Body)
		}
	}
	if res := h.post("/api/v1/discover", h.token(t, alice), `{}`); res.Code != http.StatusForbidden {
		t.Errorf("writes are refused too: %d", res.Code)
	}
}

func between(s, start, end string) string {
	i := strings.Index(s, start)
	if i < 0 {
		return ""
	}
	s = s[i+len(start):]
	if j := strings.Index(s, end); j >= 0 {
		return s[:j]
	}
	return s
}

type fakePurger struct{ done chan string }

func (f fakePurger) Purge(_ context.Context, userID string) error {
	f.done <- userID
	return nil
}

type fakeSignIns struct{ removed []string }

func (f *fakeSignIns) RemoveUser(_ context.Context, id string) error {
	f.removed = append(f.removed, id)
	return nil
}

func TestAccountRenameAndDelete(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	signIns := &fakeSignIns{}
	usage := &fakeUsage{plan: credits.PlanFree}
	purger := fakePurger{done: make(chan string, 1)}
	h.deps.SignIns, h.deps.Usage, h.deps.Purger = signIns, usage, purger
	h.rebuild()
	a := h.token(t, alice)

	if res := send(h, http.MethodPatch, "/api/v1/me", a, `{"name":"  Ada Lovelace "}`); res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "Ada Lovelace") {
		t.Fatalf("rename: %d %s", res.Code, res.Body)
	}
	if res := send(h, http.MethodPatch, "/api/v1/me", a, `{"name":""}`); res.Code != http.StatusBadRequest {
		t.Fatalf("empty name: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/me", "", `{}`); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous delete: %d", res.Code)
	}
	if res := send(h, http.MethodDelete, "/api/v1/me", a, `{"confirm_email":"nobody@example.com"}`); res.Code != http.StatusBadRequest || len(signIns.removed) != 0 {
		t.Fatalf("wrong email: %d removed=%v", res.Code, signIns.removed)
	}
	usage.plan = credits.PlanPro
	if res := send(h, http.MethodDelete, "/api/v1/me", a, `{"confirm_email":"a@example.com"}`); res.Code != http.StatusConflict || len(signIns.removed) != 0 {
		t.Fatalf("a Pro member deleted while subscribed: %d removed=%v", res.Code, signIns.removed)
	}
	usage.plan = credits.PlanFree
	if res := send(h, http.MethodDelete, "/api/v1/me", a, `{"confirm_email":"A@Example.com"}`); res.Code != http.StatusNoContent || len(signIns.removed) != 1 || signIns.removed[0] != alice {
		t.Fatalf("delete: %d removed=%v", res.Code, signIns.removed)
	}
	select {
	case erased := <-purger.done:
		if erased != alice {
			t.Fatalf("erased %q", erased)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("the account's content was not erased")
	}
	// The account is closed at once: the next request is refused.
	if res := send(h, http.MethodGet, "/api/v1/me", a, ""); res.Code != http.StatusForbidden {
		t.Fatalf("a deleted account was served: %d", res.Code)
	}
}
