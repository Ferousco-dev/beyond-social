package voices

import (
	"context"
	"errors"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
)

type fakeRecords struct {
	own    []Voice
	owners map[string]string // voice id -> user id
	err    error
}

func (f fakeRecords) OwnVoices(context.Context, string) ([]Voice, error) { return f.own, f.err }
func (f fakeRecords) Ownership(_ context.Context, userID, voiceID string) (bool, bool, error) {
	owner, ok := f.owners[voiceID]
	return ok && owner == userID, ok && owner != userID, f.err
}

type fakeProvider struct {
	page    heygen.VoicePage
	exists  map[string]bool
	err     error
	lastQ   heygen.VoiceQuery
	getCall int
}

func (f *fakeProvider) ListVoices(_ context.Context, q heygen.VoiceQuery) (heygen.VoicePage, error) {
	f.lastQ = q
	return f.page, f.err
}

func (f *fakeProvider) GetVoice(_ context.Context, id string) (heygen.Voice, bool, error) {
	f.getCall++
	return heygen.Voice{ID: id}, f.exists[id], f.err
}

var ctx = context.Background()

func TestListPutsOwnVoicesFirstOnTheFirstPageOnly(t *testing.T) {
	p := &fakeProvider{page: heygen.VoicePage{Voices: []heygen.Voice{{ID: "lib-1", Name: "Ava", Language: "English"}}, HasMore: true, NextToken: "n"}}
	s := NewService(fakeRecords{own: []Voice{{ID: "mine", Name: "Mine", Scope: ScopeOwn}}}, p)

	page, err := s.List(ctx, "alice", Query{Limit: 20})
	if err != nil || len(page.Voices) != 2 || page.Voices[0].ID != "mine" || page.Voices[1].Scope != ScopeLibrary || !page.HasMore || page.NextToken != "n" {
		t.Fatalf("%+v %v", page, err)
	}
	if p.lastQ.Type != "public" {
		t.Fatalf("only the public library may be listed, got type %q", p.lastQ.Type)
	}
	next, _ := s.List(ctx, "alice", Query{Limit: 20, Token: "n"})
	if len(next.Voices) != 1 || next.Voices[0].Scope != ScopeLibrary {
		t.Fatalf("later pages must not repeat own voices: %+v", next)
	}
}

func TestAllowed(t *testing.T) {
	p := &fakeProvider{exists: map[string]bool{"lib-1": true, "bobs": true}}
	s := NewService(fakeRecords{owners: map[string]string{"mine": "alice", "bobs": "bob"}}, p)

	if err := s.Allowed(ctx, "alice", "mine"); err != nil || p.getCall != 0 {
		t.Fatalf("own voices need no provider call: %v calls=%d", err, p.getCall)
	}
	if err := s.Allowed(ctx, "alice", "lib-1"); err != nil {
		t.Fatalf("library voices are allowed: %v", err)
	}
	// Bob's cloned voice exists at HeyGen, but it is not Alice's to use.
	if err := s.Allowed(ctx, "alice", "bobs"); !errors.Is(err, ErrNotAllowed) {
		t.Fatalf("another user's voice must be refused: %v", err)
	}
	for _, id := range []string{"", "made-up"} {
		if err := s.Allowed(ctx, "alice", id); !errors.Is(err, ErrNotAllowed) {
			t.Fatalf("%q must be refused: %v", id, err)
		}
	}
}

func TestProviderErrorsAreNotTreatedAsRefusals(t *testing.T) {
	boom := errors.New("provider down")
	s := NewService(fakeRecords{}, &fakeProvider{err: boom})
	if err := s.Allowed(ctx, "alice", "x"); errors.Is(err, ErrNotAllowed) || err == nil {
		t.Fatalf("a provider failure is an error, not a refusal: %v", err)
	}
	if _, err := s.List(ctx, "alice", Query{}); err == nil {
		t.Fatal("list should surface provider errors")
	}
}
