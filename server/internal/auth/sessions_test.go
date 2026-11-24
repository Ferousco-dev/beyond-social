package auth

import (
	"context"
	"crypto/ecdsa"
	"errors"
	"testing"
	"time"
)

type fakeSessions struct {
	alive map[string]bool
	err   error
	calls int
}

func (f *fakeSessions) Alive(_ context.Context, id string) (bool, error) {
	f.calls++
	return f.alive[id], f.err
}

func TestATokenFromASignedOutSessionIsRefused(t *testing.T) {
	key := newECKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": key})
	sessions := &fakeSessions{alive: map[string]bool{"s1": true}}
	v := newTestVerifier(srv.URL, "").WithSessions(sessions)
	now := time.Now()
	v.sessions.now = func() time.Time { return now }

	claims := baseClaims()
	claims["session_id"] = "s1"
	token := signES256(t, "k1", key, claims)

	id, err := v.Verify(context.Background(), token)
	if err != nil || id.SessionID != "s1" {
		t.Fatalf("a live session's token should work: %+v %v", id, err)
	}

	// The person signs out: Supabase deletes the session.
	sessions.alive["s1"] = false
	if _, err := v.Verify(context.Background(), token); err != nil {
		t.Fatalf("within the cache window the earlier answer stands: %v", err)
	}
	if sessions.calls != 1 {
		t.Fatalf("the database was asked %d times; the cache should answer", sessions.calls)
	}
	now = now.Add(SessionTTL + time.Second)
	if _, err := v.Verify(context.Background(), token); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("after sign-out the token must stop working: %v", err)
	}
}

func TestASessionThatCannotBeCheckedIsRefused(t *testing.T) {
	key := newECKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": key})
	v := newTestVerifier(srv.URL, "").WithSessions(&fakeSessions{err: errors.New("database down")})
	claims := baseClaims()
	claims["session_id"] = "s1"
	if _, err := v.Verify(context.Background(), signES256(t, "k1", key, claims)); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("an unchecked session must not pass: %v", err)
	}
}

func TestATokenWithoutASessionIsJudgedOnItsSignatureAlone(t *testing.T) {
	key := newECKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": key})
	sessions := &fakeSessions{}
	v := newTestVerifier(srv.URL, "").WithSessions(sessions)
	if _, err := v.Verify(context.Background(), signES256(t, "k1", key, baseClaims())); err != nil || sessions.calls != 0 {
		t.Fatalf("err=%v calls=%d", err, sessions.calls)
	}
}
