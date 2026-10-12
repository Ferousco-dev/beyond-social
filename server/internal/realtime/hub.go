// Package realtime delivers per-user events over authenticated WebSockets.
package realtime

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
)

const (
	sendBuffer         = 32
	maxConnsPerUser    = 5
	closeGoingAway     = 1001
	closePolicyBreach  = 1008
	closeTryAgainLater = 1013
)

// Hub tracks live connections by user and fans events out to them. Delivery is
// strictly non-blocking: a client that cannot keep up is disconnected rather
// than allowed to hold up the publisher or other users.
type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*client]struct{}
	closed  bool
	active  sync.WaitGroup
}

func NewHub() *Hub {
	return &Hub{clients: make(map[string]map[*client]struct{})}
}

// Publish sends the event to every connection owned by userID, and to no one else.
func (h *Hub) Publish(userID string, event Event) {
	frame, err := json.Marshal(event)
	if err != nil {
		slog.Error("marshal realtime event", "type", event.Type, "error", err)
		return
	}

	h.mu.RLock()
	targets := make([]*client, 0, len(h.clients[userID]))
	for c := range h.clients[userID] {
		targets = append(targets, c)
	}
	h.mu.RUnlock()

	for _, c := range targets {
		select {
		case c.send <- frame:
		default:
			c.kill(closeTryAgainLater)
		}
	}
}

// Close disconnects every client and waits for their goroutines to finish or
// for ctx to expire.
func (h *Hub) Close(ctx context.Context) {
	h.mu.Lock()
	h.closed = true
	for _, set := range h.clients {
		for c := range set {
			c.stop(closeGoingAway)
		}
	}
	h.mu.Unlock()

	done := make(chan struct{})
	go func() { h.active.Wait(); close(done) }()
	select {
	case <-done:
	case <-ctx.Done():
		h.mu.RLock()
		defer h.mu.RUnlock()
		for _, set := range h.clients {
			for c := range set {
				c.kill(closeGoingAway)
			}
		}
	}
}

// add registers c, refusing when the hub is closed or the user has too many
// connections. The caller must call remove when add returns true.
func (h *Hub) add(c *client) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.closed || len(h.clients[c.userID]) >= maxConnsPerUser {
		return false
	}
	if h.clients[c.userID] == nil {
		h.clients[c.userID] = make(map[*client]struct{})
	}
	h.clients[c.userID][c] = struct{}{}
	return true
}

func (h *Hub) remove(c *client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients[c.userID], c)
	if len(h.clients[c.userID]) == 0 {
		delete(h.clients, c.userID)
	}
}

// begin marks a connection handler as running; it returns false once closed.
func (h *Hub) begin() bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.closed {
		return false
	}
	h.active.Add(1)
	return true
}

func (h *Hub) end() { h.active.Done() }
