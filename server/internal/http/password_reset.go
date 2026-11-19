package httpserver

import (
	"context"
	"log/slog"
	"net/http"
	"net/mail"
	"strings"
	"sync"
	"time"
)

// resetCooldown keeps one address from being mailed over and over, whoever asks.
const resetCooldown = time.Minute

// RecoveryTokens makes a one-time token for resetting an account's password.
type RecoveryTokens interface {
	RecoveryToken(ctx context.Context, email string) (token string, ok bool, err error)
}

// ResetMailer emails the reset link.
type ResetMailer interface {
	PasswordReset(ctx context.Context, to, token string)
}

type resetGate struct {
	mu   sync.Mutex
	last map[string]time.Time
	now  func() time.Time
}

func newResetGate() *resetGate { return &resetGate{last: map[string]time.Time{}, now: time.Now} }

func (g *resetGate) allow(email string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	now := g.now()
	if len(g.last) > 5000 {
		for k, t := range g.last {
			if now.Sub(t) > resetCooldown {
				delete(g.last, k)
			}
		}
	}
	if t, ok := g.last[email]; ok && now.Sub(t) < resetCooldown {
		return false
	}
	g.last[email] = now
	return true
}

// requestPasswordReset emails a reset link to an address that has an account. It
// answers the same way whether or not there is one, and before any work is done,
// so neither the reply nor its timing says who is registered.
func (a *App) requestPasswordReset(w http.ResponseWriter, r *http.Request) {
	if a.deps.Recovery == nil || a.deps.ResetMail == nil {
		writeError(w, http.StatusServiceUnavailable, "unavailable", "password reset is not available right now")
		return
	}
	var req struct {
		Email string `json:"email"`
	}
	if !decodeJSONLimit(w, r, &req, 2<<10) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if parsed, err := mail.ParseAddress(email); err != nil || parsed.Address != email || len(email) > 254 {
		writeError(w, http.StatusBadRequest, "invalid_request", "enter a valid email address")
		return
	}
	if a.resets.allow(email) {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			token, ok, err := a.deps.Recovery.RecoveryToken(ctx, email)
			if err != nil {
				slog.Error("password reset: could not make a token", "error", err)
				return
			}
			if ok {
				a.deps.ResetMail.PasswordReset(ctx, email, token)
			}
		}()
	}
	writeData(w, http.StatusAccepted, map[string]bool{"accepted": true})
}
