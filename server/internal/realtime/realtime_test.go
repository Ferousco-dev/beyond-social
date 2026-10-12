package realtime

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/gorilla/websocket"
)

const (
	alice = "6f1c5a0e-7a53-4d0e-9f56-0a3f6a1b2c3d"
	bob   = "0b5d3c1a-2d4e-4f60-8a71-92b3c4d5e6f7"
)

type fakeVerifier map[string]string

func (f fakeVerifier) Verify(_ context.Context, token string) (auth.Identity, error) {
	if id, ok := f[token]; ok {
		return auth.Identity{UserID: id}, nil
	}
	return auth.Identity{}, errors.New("bad token")
}

type rig struct {
	hub *Hub
	url string
}

func newRig(t *testing.T, mutate func(*Options)) *rig {
	t.Helper()
	hub := NewHub()
	opts := Options{
		Hub:            hub,
		Verifier:       fakeVerifier{"tok-alice": alice, "tok-bob": bob},
		AllowedOrigins: []string{"https://app.example.com"},
		AuthTimeout:    300 * time.Millisecond,
		PingInterval:   50 * time.Millisecond,
		PongWait:       400 * time.Millisecond,
	}
	if mutate != nil {
		mutate(&opts)
	}
	srv := httptest.NewServer(NewHandler(opts))
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		hub.Close(ctx)
		srv.Close()
	})
	return &rig{hub: hub, url: "ws" + strings.TrimPrefix(srv.URL, "http")}
}

func (r *rig) dial(t *testing.T, origin string) (*websocket.Conn, *http.Response, error) {
	t.Helper()
	header := http.Header{}
	if origin != "" {
		header.Set("Origin", origin)
	}
	return websocket.DefaultDialer.Dial(r.url, header)
}

func (r *rig) connect(t *testing.T, token string) *websocket.Conn {
	t.Helper()
	conn, _, err := r.dial(t, "https://app.example.com")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := conn.WriteJSON(map[string]string{"type": "auth", "token": token}); err != nil {
		t.Fatal(err)
	}
	return conn
}

func readEvent(t *testing.T, conn *websocket.Conn) Event {
	t.Helper()
	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	var e Event
	if err := conn.ReadJSON(&e); err != nil {
		t.Fatalf("read event: %v", err)
	}
	return e
}

func expectCloseCode(t *testing.T, conn *websocket.Conn, code int) {
	t.Helper()
	_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, _, err := conn.ReadMessage()
	var closeErr *websocket.CloseError
	if !errors.As(err, &closeErr) || closeErr.Code != code {
		t.Fatalf("expected close code %d, got %v", code, err)
	}
}

func (r *rig) connections(userID string) int {
	r.hub.mu.RLock()
	defer r.hub.mu.RUnlock()
	return len(r.hub.clients[userID])
}

func waitFor(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s", what)
}

func TestAuthenticatedClientReceivesReadyAndOwnEvents(t *testing.T) {
	r := newRig(t, nil)
	conn := r.connect(t, "tok-alice")

	if ready := readEvent(t, conn); ready.Type != "connection.ready" || ready.ResourceID != alice {
		t.Fatalf("unexpected ready event %+v", ready)
	}

	event, _ := NewEvent("job.updated", "job-1", map[string]string{"status": "running"})
	r.hub.Publish(alice, event)

	got := readEvent(t, conn)
	if got.Type != "job.updated" || got.ResourceID != "job-1" || got.Timestamp.IsZero() {
		t.Fatalf("unexpected envelope %+v", got)
	}
	var payload map[string]string
	_ = json.Unmarshal(got.Payload, &payload)
	if payload["status"] != "running" {
		t.Fatalf("unexpected payload %s", got.Payload)
	}
}

func TestEventsAreIsolatedPerUser(t *testing.T) {
	r := newRig(t, nil)
	a := r.connect(t, "tok-alice")
	b := r.connect(t, "tok-bob")
	readEvent(t, a)
	readEvent(t, b)

	event, _ := NewEvent("job.created", "job-a", nil)
	r.hub.Publish(alice, event)
	readEvent(t, a)

	_ = b.SetReadDeadline(time.Now().Add(150 * time.Millisecond))
	if _, msg, err := b.ReadMessage(); err == nil {
		t.Fatalf("bob received alice's event: %s", msg)
	}
}

func TestInvalidAuthIsRejected(t *testing.T) {
	r := newRig(t, nil)

	t.Run("bad token", func(t *testing.T) {
		expectCloseCode(t, r.connect(t, "forged"), closePolicyBreach)
	})
	t.Run("wrong first message", func(t *testing.T) {
		conn, _, err := r.dial(t, "https://app.example.com")
		if err != nil {
			t.Fatal(err)
		}
		defer conn.Close()
		_ = conn.WriteJSON(map[string]string{"type": "subscribe", "user": alice})
		expectCloseCode(t, conn, closePolicyBreach)
	})
	t.Run("no message before timeout", func(t *testing.T) {
		conn, _, err := r.dial(t, "https://app.example.com")
		if err != nil {
			t.Fatal(err)
		}
		defer conn.Close()
		_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		if _, _, err := conn.ReadMessage(); err == nil {
			t.Fatal("expected the server to close an unauthenticated connection")
		}
	})
	if n := r.connections(alice); n != 0 {
		t.Fatalf("rejected clients must not be registered, found %d", n)
	}
}

func TestOriginValidation(t *testing.T) {
	r := newRig(t, nil)

	if _, resp, err := r.dial(t, "https://evil.example.com"); err == nil || resp == nil || resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 for a foreign origin, got %v %v", resp, err)
	}
	for _, origin := range []string{"https://app.example.com", ""} {
		conn, _, err := r.dial(t, origin)
		if err != nil {
			t.Fatalf("origin %q should be allowed: %v", origin, err)
		}
		conn.Close()
	}
}

func TestEmptyAllowListRejectsBrowserOrigins(t *testing.T) {
	r := newRig(t, func(o *Options) { o.AllowedOrigins = nil })
	if _, _, err := r.dial(t, "https://app.example.com"); err == nil {
		t.Fatal("an empty allow list must reject browser origins")
	}
}

func TestHeartbeatPingsClientsAndDropsDeadOnes(t *testing.T) {
	r := newRig(t, nil)

	live := r.connect(t, "tok-alice")
	var pings atomic.Int32
	live.SetPingHandler(func(string) error { pings.Add(1); return nil })
	readEvent(t, live)
	go func() {
		for {
			if _, _, err := live.ReadMessage(); err != nil {
				return
			}
		}
	}()
	waitFor(t, "pings", func() bool { return pings.Load() >= 2 })

	// A client that never answers pings is evicted once PongWait elapses.
	silent := r.connect(t, "tok-bob")
	waitFor(t, "registration", func() bool { return r.connections(bob) == 1 })
	_ = silent
	waitFor(t, "eviction of silent client", func() bool { return r.connections(bob) == 0 })
}

func TestSlowClientCannotBlockPublishers(t *testing.T) {
	r := newRig(t, func(o *Options) { o.PongWait = 5 * time.Second; o.PingInterval = 5 * time.Second })
	slow := r.connect(t, "tok-alice")
	_ = slow // never reads
	waitFor(t, "registration", func() bool { return r.connections(alice) == 1 })

	event, _ := NewEvent("job.updated", "j", map[string]string{"pad": strings.Repeat("x", 4096)})
	done := make(chan struct{})
	go func() {
		for range 5000 {
			r.hub.Publish(alice, event)
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("Publish blocked on a client that is not reading")
	}
	waitFor(t, "slow client eviction", func() bool { return r.connections(alice) == 0 })
}

func TestPerUserConnectionCap(t *testing.T) {
	r := newRig(t, nil)
	for range maxConnsPerUser {
		readEvent(t, r.connect(t, "tok-alice"))
	}
	expectCloseCode(t, r.connect(t, "tok-alice"), closeTryAgainLater)
}

func TestHubCloseDisconnectsClientsGracefully(t *testing.T) {
	r := newRig(t, nil)
	conn := r.connect(t, "tok-alice")
	readEvent(t, conn)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	r.hub.Close(ctx)

	expectCloseCode(t, conn, closeGoingAway)
	if n := r.connections(alice); n != 0 {
		t.Fatalf("expected no connections after close, got %d", n)
	}
	if late, _, err := r.dial(t, ""); err == nil {
		defer late.Close()
		expectCloseCode(t, late, closeGoingAway)
	}
}
