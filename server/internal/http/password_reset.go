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

// Limits on reset emails. The request reaches this API from the web server, so
// every caller shares one address and a per-visitor limit would block everyone;
// the caps are per address and overall instead. A cooldown alone still let one
// person's inbox be filled 1,440 times a day, and a script could mail thousands
// of addresses, spending the email quota and the sender's reputation.
const (
	// resetCooldown keeps one address from being mailed twice in a row.
	resetCooldown = time.Minute
	// resetDailyPerAddress is the most reset emails one address gets in a day.
	resetDailyPerAddress = 5
	// resetHourlyTotal caps reset emails across all addresses.
	resetHourlyTotal = 300
	resetDay         = 24 * time.Hour
)

// RecoveryTokens makes a one-time token for resetting an account's password.
type RecoveryTokens interface {
	RecoveryToken(ctx context.Context, email string) (token string, ok bool, err error)
}

// ResetMailer emails the reset link.
type ResetMailer interface {
	PasswordReset(ctx context.Context, to, token string)
}

type resetGate struct {
	mu sync.Mutex
	// sent holds the times each address was mailed in the last day, oldest first.
	sent map[string][]time.Time
	// recent holds the times of every email in the last hour, oldest first.
	recent []time.Time
	now    func() time.Time
}

func newResetGate() *resetGate { return &resetGate{sent: map[string][]time.Time{}, now: time.Now} }

// within drops the times older than window and returns what is left.
func within(times []time.Time, now time.Time, window time.Duration) []time.Time {
	i := 0
	for i < len(times) && now.Sub(times[i]) >= window {
		i++
	}
	return times[i:]
}

func (g *resetGate) allow(email string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	now := g.now()
	if len(g.sent) > 5000 {
		for k, times := range g.sent {
			if len(within(times, now, resetDay)) == 0 {
				delete(g.sent, k)
			}
		}
	}
	g.recent = within(g.recent, now, time.Hour)
	if len(g.recent) >= resetHourlyTotal {
		return false
	}
	times := within(g.sent[email], now, resetDay)
	if len(times) >= resetDailyPerAddress || (len(times) > 0 && now.Sub(times[len(times)-1]) < resetCooldown) {
		g.sent[email] = times
		return false
	}
	g.sent[email] = append(times, now)
	g.recent = append(g.recent, now)
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
