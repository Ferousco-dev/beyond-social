package httpserver

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/assets"
	"github.com/Ferousco-dev/beyond-social/server/internal/voices"
)

type fakeVoiceCloner struct {
	voice voices.Voice
	err   error
}

func (f *fakeVoiceCloner) Clone(_ context.Context, _, _, _ string) (voices.Voice, error) {
	if f.err != nil {
		return voices.Voice{}, f.err
	}
	return f.voice, nil
}

type fakeConsentGroups struct {
	consented bool
}

func (f *fakeConsentGroups) List(_ context.Context, _ string) ([]assets.Group, error) {
	return nil, nil
}

func (f *fakeConsentGroups) Create(_ context.Context, _, _ string) (assets.Group, error) {
	return assets.Group{}, nil
}

func (f *fakeConsentGroups) Detail(_ context.Context, userID, _ string) (assets.GroupDetail, error) {
	if userID != alice {
		return assets.GroupDetail{}, assets.ErrNotFound
	}
	detail := assets.GroupDetail{Group: assets.Group{ID: "80000000-0000-4000-8000-000000000001"}}
	if f.consented {
		now := time.Now().UTC()
		detail.VoiceConsent = &now
	}
	return detail, nil
}

func (f *fakeConsentGroups) Set(_ context.Context, _ string, _ string, _ assets.Slots, _ []assets.Extra) (assets.Group, error) {
	return assets.Group{}, nil
}

func (f *fakeConsentGroups) Rename(_ context.Context, _ string, _ string, _ string) (assets.Group, error) {
	return assets.Group{}, nil
}

func (f *fakeConsentGroups) Consent(_ context.Context, _ string, _ string, _ string) (assets.Group, error) {
	return assets.Group{}, nil
}

func (f *fakeConsentGroups) Delete(_ context.Context, _ string, _ string) error { return nil }

func TestCloneVoiceNeedsConsent(t *testing.T) {
	newCloneHarness := func(consented bool) *harness {
		h := newHarness(t, &fakeRepo{}, fakePinger{})
		h.deps.VoiceCloner = &fakeVoiceCloner{voice: voices.Voice{ID: "v-1", Name: "Feranmi", Scope: voices.ScopeOwn}}
		h.deps.AssetGroups = &fakeConsentGroups{consented: consented}
		h.rebuild()
		return h
	}
	mediaID := "90000000-0000-4000-8000-000000000001"
	groupID := "80000000-0000-4000-8000-000000000001"
	body := `{"name":"Feranmi","media_id":"` + mediaID + `","group_id":"` + groupID + `"}`

	denied := newCloneHarness(false)
	if res := denied.post("/api/v1/voices/clone", denied.token(t, alice), body); res.Code != http.StatusConflict {
		t.Fatalf("no consent: expected 409, got %d: %s", res.Code, res.Body)
	}

	allowed := newCloneHarness(true)
	token := allowed.token(t, alice)
	if res := allowed.post("/api/v1/voices/clone", token, body); res.Code != http.StatusCreated {
		t.Fatalf("clone: expected 201, got %d: %s", res.Code, res.Body)
	}
	for name, payload := range map[string]string{
		"bad media": `{"name":"x","media_id":"nope","group_id":"` + groupID + `"}`,
		"bad group": `{"name":"x","media_id":"` + mediaID + `","group_id":"nope"}`,
		"not json":  `nope`,
		"anonymous": ``,
	} {
		token := token
		if name == "anonymous" {
			token = ""
		}
		if res := allowed.post("/api/v1/voices/clone", token, payload); res.Code != map[string]int{
			"bad media": http.StatusBadRequest, "bad group": http.StatusBadRequest,
			"not json": http.StatusBadRequest, "anonymous": http.StatusUnauthorized,
		}[name] {
			t.Errorf("%s: got %d", name, res.Code)
		}
	}
}
