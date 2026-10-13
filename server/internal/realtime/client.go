package realtime

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// defaultWriteWait bounds one write to a client.
const defaultWriteWait = 10 * time.Second

type client struct {
	userID string
	conn   *websocket.Conn
	send   chan []byte

	closeOnce sync.Once
	done      chan struct{}
	closeCode int
}

func newClient(userID string, conn *websocket.Conn) *client {
	return &client{userID: userID, conn: conn, send: make(chan []byte, sendBuffer), done: make(chan struct{})}
}

// stop asks the write loop to send a close frame and tear the connection down.
// It is safe to call from any goroutine, any number of times.
func (c *client) stop(code int) {
	c.closeOnce.Do(func() {
		c.closeCode = code
		close(c.done)
	})
}

// kill drops the connection immediately. It is for clients that have stopped
// draining their socket, where waiting for a polite close frame would just
// wait on a blocked write.
func (c *client) kill(code int) {
	c.stop(code)
	_ = c.conn.Close()
}

// writeLoop is the only goroutine that writes to the connection. It also sends
// the heartbeat pings that keep half-dead connections from lingering.
func (c *client) writeLoop(pingInterval, writeWait time.Duration) {
	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()
	defer c.conn.Close()

	// The deadline is set per write, never once per loop turn: a deadline set
	// before waiting would already have passed by the time a ping is due, and
	// every connection would die at the first heartbeat.
	write := func(kind int, data []byte) error {
		_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
		return c.conn.WriteMessage(kind, data)
	}
	for {
		select {
		case frame := <-c.send:
			if err := write(websocket.TextMessage, frame); err != nil {
				return
			}
		case <-ticker.C:
			if err := write(websocket.PingMessage, nil); err != nil {
				return
			}
		case <-c.done:
			_ = write(websocket.CloseMessage, websocket.FormatCloseMessage(c.closeCode, ""))
			return
		}
	}
}

// readLoop exists to process control frames. Clients have nothing to say after
// authenticating, so any data they send is discarded.
func (c *client) readLoop(pongWait time.Duration) {
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			return
		}
	}
}
