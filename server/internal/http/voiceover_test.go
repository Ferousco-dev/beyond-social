package httpserver

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/kietools"
)

type fakeVoiceover struct {
	args map[string]any
	key  string
}

func (f *fakeVoiceover) Submit(_ context.Context, _ string, jobType string, args map[string]any, key string) (jobs.Job, bool, error) {
	f.args, f.key = args, key
	return jobs.Job{ID: postID, Type: jobType, Status: jobs.StatusQueued}, true, nil
}

func TestVoiceoverIsOneRequestInOneVoiceAndChecksTheTextFirst(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	fake := &fakeVoiceover{}
	h.deps.Voiceover = fake
	h.deps.Media = fakeMedia{}
	h.rebuild()
	a := h.token(t, alice)

	if res := send(h, http.MethodPost, "/api/v1/voiceover", "", `{"text":"hello"}`); res.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/voiceover", a, `{"text":"  "}`); res.Code != http.StatusBadRequest || fake.args != nil {
		t.Fatalf("empty text was queued: %d %v", res.Code, fake.args)
	}
	if res := send(h, http.MethodPost, "/api/v1/voiceover", a, `{"text":"`+strings.Repeat("a", 5001)+`"}`); res.Code != http.StatusBadRequest || fake.args != nil {
		t.Fatalf("text over the limit was queued: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/voiceover", a, `{"text":"hello","voice":"bad voice/"}`); res.Code != http.StatusBadRequest || fake.args != nil {
		t.Fatalf("a bad voice was queued: %d", res.Code)
	}
	if res := send(h, http.MethodPost, "/api/v1/voiceover", a, `{"text":"hello","voice":"EkK5I93UQWFDigLMpZcX"}`); res.Code != http.StatusBadRequest || fake.args != nil {
		t.Fatalf("a voice that was never confirmed was queued: %d", res.Code)
	}
	res := send(h, http.MethodPost, "/api/v1/voiceover", a, `{"text":" Welcome to the show. ","voice":"`+kietools.DefaultVoice+`"}`)
	if res.Code != http.StatusAccepted || fake.args["text"] != "Welcome to the show." || fake.args["voice"] != kietools.DefaultVoice {
		t.Fatalf("voiceover: %d %s %v", res.Code, res.Body, fake.args)
	}
}

func TestAdoptingAVoiceoverNeedsAUUID(t *testing.T) {
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.Media = fakeMedia{}
	h.rebuild()
	if res := send(h, http.MethodPost, "/api/v1/voiceover/not-a-uuid/adopt", h.token(t, alice), ""); res.Code != http.StatusNotFound {
		t.Fatalf("bad id: %d", res.Code)
	}
}
