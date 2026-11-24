package auth

import (
	"context"
	"sync"
	"time"
)

// SessionTTL is how long a session's answer is remembered. A token from a
// session that has signed out stops working within this long, instead of
// lasting until the token itself expires.
const SessionTTL = 30 * time.Second

// SessionChecker says whether a sign-in session still exists. Supabase deletes
// the session when the person signs out, or when it is revoked.
type SessionChecker interface {
	Alive(ctx context.Context, sessionID string) (bool, error)
}

type sessionEntry struct {
	alive bool
	until time.Time
}

// sessionCache remembers recent answers so a busy page does not ask the
// database on every request.
type sessionCache struct {
	checker SessionChecker
	now     func() time.Time
	mu      sync.Mutex
	entries map[string]sessionEntry
}

const maxSessionEntries = 50_000

func (c *sessionCache) alive(ctx context.Context, id string) (bool, error) {
	now := c.now()
	c.mu.Lock()
	if e, ok := c.entries[id]; ok && now.Before(e.until) {
		c.mu.Unlock()
		return e.alive, nil
	}
	c.mu.Unlock()

	alive, err := c.checker.Alive(ctx, id)
	if err != nil {
		return false, err
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.entries) >= maxSessionEntries {
		for k, e := range c.entries {
			if now.After(e.until) {
				delete(c.entries, k)
			}
		}
		if len(c.entries) >= maxSessionEntries {
			c.entries = map[string]sessionEntry{}
		}
	}
	c.entries[id] = sessionEntry{alive: alive, until: now.Add(SessionTTL)}
	return alive, nil
}

// WithSessions makes Verify refuse tokens whose sign-in session has ended.
func (v *Verifier) WithSessions(checker SessionChecker) *Verifier {
	v.sessions = &sessionCache{checker: checker, now: time.Now, entries: map[string]sessionEntry{}}
	return v
}

// SessionAlive says whether a session still exists, from the same short cache
// Verify uses. Without a checker every session counts as alive. Long-lived
// connections call it to notice a sign-out.
func (v *Verifier) SessionAlive(ctx context.Context, sessionID string) (bool, error) {
	if v.sessions == nil || sessionID == "" {
		return true, nil
	}
	return v.sessions.alive(ctx, sessionID)
}
