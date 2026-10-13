package social

import (
	"bytes"
	"context"
	"errors"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

type memStore struct {
	mu      sync.Mutex
	states  map[string]PendingSignIn
	expiry  map[string]time.Time
	conns   map[string]Connection
	revoked []string
}

func newMem() *memStore {
	return &memStore{states: map[string]PendingSignIn{}, expiry: map[string]time.Time{}, conns: map[string]Connection{}}
}

func (m *memStore) SaveState(_ context.Context, h []byte, user string, p Platform, v []byte, exp time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.states[string(h)], m.expiry[string(h)] = PendingSignIn{UserID: user, Platform: p, VerifierCT: v}, exp
	return nil
}
func (m *memStore) TakeState(_ context.Context, h []byte, now time.Time) (PendingSignIn, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.states[string(h)]
	delete(m.states, string(h))
	return p, ok && m.expiry[string(h)].After(now), nil
}
func (m *memStore) Upsert(_ context.Context, c Connection) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	c.ID = "conn-" + string(c.Platform)
	c.CreatedAt = time.Now()
	m.conns[c.UserID+"/"+string(c.Platform)] = c
	return nil
}
func (m *memStore) List(_ context.Context, user string) ([]Connection, error) {
	var out []Connection
	for _, c := range m.conns {
		if c.UserID == user {
			out = append(out, c)
		}
	}
	return out, nil
}
func (m *memStore) Get(_ context.Context, user string, p Platform) (Connection, error) {
	c, ok := m.conns[user+"/"+string(p)]
	if !ok {
		return Connection{}, ErrNotConnected
	}
	return c, nil
}
func (m *memStore) UpdateTokens(_ context.Context, id string, a, r []byte, exp *time.Time) error {
	for k, c := range m.conns {
		if c.ID == id {
			c.AccessCT, c.ExpiresAt = a, exp
			if r != nil {
				c.RefreshCT = r
			}
			m.conns[k] = c
		}
	}
	return nil
}
func (m *memStore) MarkRevoked(_ context.Context, id string) error {
	for k, c := range m.conns {
		if c.ID == id {
			now := time.Now()
			c.RevokedAt = &now
			m.conns[k] = c
		}
	}
	m.revoked = append(m.revoked, id)
	return nil
}
func (m *memStore) Delete(_ context.Context, user string, p Platform) (Connection, error) {
	c, ok := m.conns[user+"/"+string(p)]
	if !ok {
		return Connection{}, ErrNotConnected
	}
	delete(m.conns, user+"/"+string(p))
	return c, nil
}
func (m *memStore) PurgeStates(context.Context, time.Time) error { return nil }

// xorSealer is a stand-in that keeps the "name binds the value" rule.
type xorSealer struct{}

func (xorSealer) Seal(name, plain string) ([]byte, error) {
	return []byte(name + "|" + "enc:" + plain), nil
}
func (xorSealer) Open(name string, sealed []byte) (string, error) {
	prefix := name + "|enc:"
	if !bytes.HasPrefix(sealed, []byte(prefix)) {
		return "", errors.New("wrong place")
	}
	return string(sealed[len(prefix):]), nil
}

type fakeProvider struct {
	exchangeErr error
	refreshErr  error
	gotVerifier string
	revoked     bool
	expires     time.Time
}

func (f *fakeProvider) Platform() Platform { return YouTube }
func (f *fakeProvider) Label() string      { return "YouTube" }
func (f *fakeProvider) AuthorizeURL(c Credentials, redirect, state, challenge string) string {
	return "https://auth.example/?" + url.Values{"client_id": {c.ID}, "redirect_uri": {redirect}, "state": {state}, "code_challenge": {challenge}}.Encode()
}
func (f *fakeProvider) Exchange(_ context.Context, _ Credentials, _, code, verifier string) (Tokens, Account, error) {
	f.gotVerifier = verifier
	if f.exchangeErr != nil {
		return Tokens{}, Account{}, f.exchangeErr
	}
	return Tokens{Access: "access-1", Refresh: "refresh-1", ExpiresAt: &f.expires, Scopes: []string{"upload"}}, Account{ID: "chan-1", Name: "My Channel"}, nil
}
func (f *fakeProvider) Refresh(context.Context, Credentials, Tokens) (Tokens, error) {
	if f.refreshErr != nil {
		return Tokens{}, f.refreshErr
	}
	exp := time.Now().Add(time.Hour)
	return Tokens{Access: "access-2", ExpiresAt: &exp}, nil
}
func (f *fakeProvider) Revoke(context.Context, Tokens) error { f.revoked = true; return nil }

func keys(configured bool) Keys {
	return func(_ context.Context, name string) (string, error) {
		if !configured {
			return "", provider.ErrNotConfigured(name)
		}
		return "key-" + name, nil
	}
}

func newService(prov *fakeProvider, store *memStore, configured bool) *Service {
	return NewService(store, xorSealer{}, keys(configured), func(p Platform) string { return "https://api.example/cb/" + string(p) }, prov)
}

func stateOf(t *testing.T, authURL string) (state, challenge string) {
	t.Helper()
	u, err := url.Parse(authURL)
	if err != nil {
		t.Fatal(err)
	}
	return u.Query().Get("state"), u.Query().Get("code_challenge")
}

func TestSignInRoundTripStoresOnlySealedTokensAndTheVerifierMatchesTheChallenge(t *testing.T) {
	prov, store := &fakeProvider{expires: time.Now().Add(time.Hour)}, newMem()
	svc := newService(prov, store, true)
	ctx := context.Background()
	authURL, err := svc.Begin(ctx, "u1", YouTube)
	if err != nil || !strings.Contains(authURL, "redirect_uri=https%3A%2F%2Fapi.example%2Fcb%2Fyoutube") {
		t.Fatalf("url = %q err=%v", authURL, err)
	}
	state, ch := stateOf(t, authURL)
	user, err := svc.Complete(ctx, YouTube, "the-code", state)
	if err != nil || user != "u1" {
		t.Fatalf("complete: %q %v", user, err)
	}
	if challenge(prov.gotVerifier) != ch {
		t.Fatal("the verifier sent at exchange does not match the challenge sent at sign-in")
	}
	conn := store.conns["u1/youtube"]
	if conn.AccountName != "My Channel" || bytes.Contains(conn.AccessCT, []byte("enc:access-1")) == false {
		t.Fatalf("conn = %+v", conn)
	}
	for _, field := range [][]byte{conn.AccessCT, conn.RefreshCT} {
		if string(field) == "access-1" || string(field) == "refresh-1" {
			t.Fatal("a token was stored in the clear")
		}
	}
}

func TestAStateWorksOnceExpiresAndBelongsToOnePlatform(t *testing.T) {
	prov, store := &fakeProvider{expires: time.Now().Add(time.Hour)}, newMem()
	svc := newService(prov, store, true)
	ctx := context.Background()
	authURL, _ := svc.Begin(ctx, "u1", YouTube)
	state, _ := stateOf(t, authURL)
	if _, err := svc.Complete(ctx, YouTube, "c", state); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Complete(ctx, YouTube, "c", state); !errors.Is(err, ErrBadState) {
		t.Fatalf("a state was used twice: %v", err)
	}
	if _, err := svc.Complete(ctx, YouTube, "c", "made-up"); !errors.Is(err, ErrBadState) {
		t.Fatalf("an unknown state: %v", err)
	}
	authURL, _ = svc.Begin(ctx, "u1", YouTube)
	state, _ = stateOf(t, authURL)
	if _, err := svc.Complete(ctx, TikTok, "c", state); !errors.Is(err, ErrBadState) {
		t.Fatalf("a state for another platform: %v", err)
	}
	authURL, _ = svc.Begin(ctx, "u1", YouTube)
	state, _ = stateOf(t, authURL)
	svc.now = func() time.Time { return time.Now().Add(stateTTL + time.Minute) }
	if _, err := svc.Complete(ctx, YouTube, "c", state); !errors.Is(err, ErrBadState) {
		t.Fatalf("an expired state: %v", err)
	}
}

func TestAnUnconfiguredPlatformCannotStartAndIsReportedUnavailable(t *testing.T) {
	svc := newService(&fakeProvider{}, newMem(), false)
	if _, err := svc.Begin(context.Background(), "u1", YouTube); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("err = %v", err)
	}
	list, _ := svc.List(context.Background(), "u1")
	if len(list) != len(Platforms) || list[0].Available || list[0].Connected {
		t.Fatalf("list = %+v", list)
	}
	noKey := NewService(newMem(), nil, keys(true), func(Platform) string { return "x" }, &fakeProvider{})
	if _, err := noKey.Begin(context.Background(), "u1", YouTube); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("without an encryption key: %v", err)
	}
}

func TestAFailedExchangeStoresNothing(t *testing.T) {
	prov, store := &fakeProvider{exchangeErr: errors.New("denied")}, newMem()
	svc := newService(prov, store, true)
	authURL, _ := svc.Begin(context.Background(), "u1", YouTube)
	state, _ := stateOf(t, authURL)
	if _, err := svc.Complete(context.Background(), YouTube, "c", state); err == nil {
		t.Fatal("expected an error")
	}
	if len(store.conns) != 0 {
		t.Fatalf("stored %+v", store.conns)
	}
}

func connect(t *testing.T, svc *Service) {
	t.Helper()
	authURL, _ := svc.Begin(context.Background(), "u1", YouTube)
	state, _ := stateOf(t, authURL)
	if _, err := svc.Complete(context.Background(), YouTube, "c", state); err != nil {
		t.Fatal(err)
	}
}

func TestTokenIsRenewedBeforeItExpiresAndThePlainOneIsNeverStored(t *testing.T) {
	prov, store := &fakeProvider{expires: time.Now().Add(time.Minute)}, newMem()
	svc := newService(prov, store, true)
	connect(t, svc)
	tokens, _, err := svc.Token(context.Background(), "u1", YouTube)
	if err != nil || tokens.Access != "access-2" || tokens.Refresh != "refresh-1" {
		t.Fatalf("tokens = %+v err=%v", tokens, err)
	}
	if again, _, _ := svc.Token(context.Background(), "u1", YouTube); again.Access != "access-2" {
		t.Fatalf("the renewed token was not saved: %+v", again)
	}
}

func TestAFreshTokenIsReturnedAsIs(t *testing.T) {
	prov := &fakeProvider{expires: time.Now().Add(time.Hour), refreshErr: errors.New("must not refresh")}
	svc := newService(prov, newMem(), true)
	connect(t, svc)
	if tokens, _, err := svc.Token(context.Background(), "u1", YouTube); err != nil || tokens.Access != "access-1" {
		t.Fatalf("tokens = %+v err=%v", tokens, err)
	}
}

func TestARefusedRenewalMarksTheAccountForReconnectButATemporaryFailureDoesNot(t *testing.T) {
	refused := &fakeProvider{expires: time.Now().Add(time.Minute), refreshErr: &provider.Error{Provider: "youtube", Status: 400, Message: "invalid_grant"}}
	store := newMem()
	svc := newService(refused, store, true)
	connect(t, svc)
	if _, _, err := svc.Token(context.Background(), "u1", YouTube); !errors.Is(err, ErrReconnect) {
		t.Fatalf("err = %v", err)
	}
	if _, _, err := svc.Token(context.Background(), "u1", YouTube); !errors.Is(err, ErrReconnect) {
		t.Fatalf("a revoked account must stay revoked: %v", err)
	}
	list, _ := svc.List(context.Background(), "u1")
	if !list[0].NeedsSignIn {
		t.Fatalf("list = %+v", list[0])
	}

	flaky := &fakeProvider{expires: time.Now().Add(time.Minute), refreshErr: &provider.Error{Provider: "youtube", Status: 503, Transient: true}}
	store2 := newMem()
	svc2 := newService(flaky, store2, true)
	connect(t, svc2)
	if _, _, err := svc2.Token(context.Background(), "u1", YouTube); err == nil || errors.Is(err, ErrReconnect) || len(store2.revoked) != 0 {
		t.Fatalf("a temporary failure must not revoke: %v", err)
	}
}

func TestDisconnectRemovesTheAccountAndRevokesTheToken(t *testing.T) {
	prov, store := &fakeProvider{expires: time.Now().Add(time.Hour)}, newMem()
	svc := newService(prov, store, true)
	connect(t, svc)
	if err := svc.Disconnect(context.Background(), "u1", YouTube); err != nil || !prov.revoked || len(store.conns) != 0 {
		t.Fatalf("err=%v revoked=%v conns=%d", err, prov.revoked, len(store.conns))
	}
	if err := svc.Disconnect(context.Background(), "u1", YouTube); !errors.Is(err, ErrNotConnected) {
		t.Fatalf("disconnecting twice: %v", err)
	}
}
