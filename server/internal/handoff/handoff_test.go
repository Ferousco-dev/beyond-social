package handoff

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/avatars"
)

type memStore struct {
	owners map[string]string
	spent  map[string]bool
}

func newStore() *memStore { return &memStore{owners: map[string]string{}, spent: map[string]bool{}} }

func (m *memStore) Mint(_ context.Context, userID, hash string, _ time.Time) error {
	m.owners[hash] = userID
	return nil
}
func (m *memStore) Resolve(_ context.Context, hash string) (string, bool, error) {
	u, ok := m.owners[hash]
	return u, ok && !m.spent[hash], nil
}
func (m *memStore) Claim(_ context.Context, hash, _ string) (string, bool, error) {
	u, ok := m.owners[hash]
	if !ok || m.spent[hash] {
		return "", false, nil
	}
	m.spent[hash] = true
	return u, true, nil
}

type fakeAvatars struct {
	registerErr error
	registered  []string
}

func (f *fakeAvatars) NewUploadTicket(_ context.Context, userID, _ string) (avatars.UploadTicket, error) {
	return avatars.UploadTicket{Path: userID + "/twin-x.mp4", Token: "t"}, nil
}

func (f *fakeAvatars) Register(_ context.Context, userID string, in avatars.RegisterInput) (avatars.Avatar, bool, error) {
	if f.registerErr != nil {
		return avatars.Avatar{}, false, f.registerErr
	}
	f.registered = append(f.registered, userID+"|"+in.StoragePath)
	if !in.ConsentConfirmed || in.ConsentVersion != avatars.ConsentVersion {
		return avatars.Avatar{}, false, avatars.ErrConsentRequired
	}
	return avatars.Avatar{ID: "a"}, true, nil
}

var ctx = context.Background()

func TestOnlyTheHashOfATokenIsStored(t *testing.T) {
	store := newStore()
	m, err := NewService(store, &fakeAvatars{}).Mint(ctx, "alice")
	if err != nil || len(m.Token) != 43 {
		t.Fatalf("%+v %v", m, err)
	}
	if _, stored := store.owners[m.Token]; stored {
		t.Fatal("the raw token must never be stored")
	}
	if _, stored := store.owners[hashToken(m.Token)]; !stored {
		t.Fatal("its hash should be")
	}
}

func TestClaimRegistersForTheTokenOwnerAndSpendsTheToken(t *testing.T) {
	store, av := newStore(), &fakeAvatars{}
	s := NewService(store, av)
	m, _ := s.Mint(ctx, "alice")

	if _, err := s.Claim(ctx, m.Token, "alice/twin-x.mp4"); err != nil {
		t.Fatal(err)
	}
	if len(av.registered) != 1 || av.registered[0] != "alice|alice/twin-x.mp4" {
		t.Fatalf("registered %v", av.registered)
	}
	if _, err := s.Claim(ctx, m.Token, "alice/twin-x.mp4"); !errors.Is(err, ErrInvalidLink) {
		t.Fatalf("a token works once: %v", err)
	}
}

func TestAFailedRegistrationDoesNotSpendTheToken(t *testing.T) {
	store, av := newStore(), &fakeAvatars{registerErr: avatars.ErrFootageMissing}
	s := NewService(store, av)
	m, _ := s.Mint(ctx, "alice")

	if _, err := s.Claim(ctx, m.Token, "alice/twin-x.mp4"); !errors.Is(err, avatars.ErrFootageMissing) {
		t.Fatalf("got %v", err)
	}
	if ok, _ := s.Valid(ctx, m.Token); !ok {
		t.Fatal("the phone can retry the upload with the same link")
	}
}

func TestBadTokensAreAllInvalidLinks(t *testing.T) {
	s := NewService(newStore(), &fakeAvatars{})
	for _, token := range []string{"", "short", strings.Repeat("a", 43), strings.Repeat("!", 43), strings.Repeat("a", 44)} {
		if _, err := s.Ticket(ctx, token, "video/mp4"); !errors.Is(err, ErrInvalidLink) {
			t.Errorf("ticket %q: %v", token, err)
		}
		if _, err := s.Claim(ctx, token, "p"); !errors.Is(err, ErrInvalidLink) {
			t.Errorf("claim %q: %v", token, err)
		}
		if ok, _ := s.Valid(ctx, token); ok {
			t.Errorf("valid %q", token)
		}
	}
}
