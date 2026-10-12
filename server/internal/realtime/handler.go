package realtime

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"slices"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
	"github.com/gorilla/websocket"
)

// TokenVerifier is satisfied by *auth.Verifier.
type TokenVerifier interface {
	Verify(ctx context.Context, token string) (auth.Identity, error)
}

type Options struct {
	Hub            *Hub
	Verifier       TokenVerifier
	AllowedOrigins []string
	// Zero values fall back to production defaults; tests shorten them.
	AuthTimeout  time.Duration
	PingInterval time.Duration
	PongWait     time.Duration
}

const (
	maxAuthMessageBytes = 8192
	eventReady          = "connection.ready"
)

// NewHandler returns the WebSocket endpoint.
//
// Browsers cannot set an Authorization header on a WebSocket, and a token in
// the URL ends up in access logs and history. So the connection opens
// unauthenticated and the client must send {"type":"auth","token":"<jwt>"} as
// its first message within AuthTimeout. Nothing is registered or delivered
// before that message verifies, and the user ID comes from the verified token.
func NewHandler(opts Options) http.Handler {
	if opts.AuthTimeout == 0 {
		opts.AuthTimeout = 5 * time.Second
	}
	if opts.PingInterval == 0 {
		opts.PingInterval = 30 * time.Second
	}
	if opts.PongWait == 0 {
		opts.PongWait = 2 * opts.PingInterval
	}
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			// Non-browser clients send no Origin; they authenticate by token and
			// have no ambient credentials a hostile page could ride on.
			return origin == "" || slices.Contains(opts.AllowedOrigins, origin)
		},
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return // Upgrade has already written the HTTP error, including 403 for bad origins.
		}
		if !opts.Hub.begin() {
			_ = conn.WriteControl(websocket.CloseMessage,
				websocket.FormatCloseMessage(closeGoingAway, "shutting down"), time.Now().Add(writeWait))
			_ = conn.Close()
			return
		}
		defer opts.Hub.end()
		serve(r.Context(), conn, opts)
	})
}

func serve(ctx context.Context, conn *websocket.Conn, opts Options) {
	identity, ok := authenticate(ctx, conn, opts)
	if !ok {
		_ = conn.WriteControl(websocket.CloseMessage,
			websocket.FormatCloseMessage(closePolicyBreach, "unauthorized"), time.Now().Add(writeWait))
		_ = conn.Close()
		return
	}

	c := newClient(identity.UserID, conn)
	if !opts.Hub.add(c) {
		_ = conn.WriteControl(websocket.CloseMessage,
			websocket.FormatCloseMessage(closeTryAgainLater, "too many connections"), time.Now().Add(writeWait))
		_ = conn.Close()
		return
	}
	defer opts.Hub.remove(c)

	if ready, err := NewEvent(eventReady, identity.UserID, map[string]string{"status": "connected"}); err == nil {
		if frame, err := json.Marshal(ready); err == nil {
			c.send <- frame
		}
	}

	writerDone := make(chan struct{})
	go func() { defer close(writerDone); c.writeLoop(opts.PingInterval) }()

	c.readLoop(opts.PongWait)
	c.stop(closeGoingAway)
	<-writerDone
}

func authenticate(ctx context.Context, conn *websocket.Conn, opts Options) (auth.Identity, bool) {
	conn.SetReadLimit(maxAuthMessageBytes)
	_ = conn.SetReadDeadline(time.Now().Add(opts.AuthTimeout))

	var msg struct {
		Type  string `json:"type"`
		Token string `json:"token"`
	}
	if err := conn.ReadJSON(&msg); err != nil || msg.Type != "auth" {
		return auth.Identity{}, false
	}
	identity, err := opts.Verifier.Verify(ctx, msg.Token)
	if err != nil {
		slog.Info("websocket token rejected", "reason", err.Error())
		return auth.Identity{}, false
	}
	conn.SetReadLimit(512)
	return identity, true
}
