package httpserver

import (
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/auth"
)

// Each signed-in person may make this many requests a second on average, in
// bursts of up to the cap. It is generous on purpose: one page can fire a dozen
// calls and the editor polls. What it stops is a script, or a stuck loop in a
// browser, hammering the database and the model providers.
const (
	userRate  = 20.0
	userBurst = 60.0
	// idleAfter is how long a person's bucket is kept once they go quiet.
	idleAfter = 10 * time.Minute
	sweepAt   = 10_000
)

type bucket struct {
	tokens float64
	last   time.Time
}

// limiter is a token bucket per key, held in memory. With one API instance that
// is exact; with several each instance allows its share, which is still a cap.
type limiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	now     func() time.Time
}

func newLimiter() *limiter { return &limiter{buckets: map[string]*bucket{}, now: time.Now} }

// allow spends one token, or says how long until there is one.
func (l *limiter) allow(key string) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	if len(l.buckets) >= sweepAt {
		for k, b := range l.buckets {
			if now.Sub(b.last) > idleAfter {
				delete(l.buckets, k)
			}
		}
	}
	b, ok := l.buckets[key]
	if !ok {
		b = &bucket{tokens: userBurst, last: now}
		l.buckets[key] = b
	}
	b.tokens = math.Min(userBurst, b.tokens+now.Sub(b.last).Seconds()*userRate)
	b.last = now
	if b.tokens >= 1 {
		b.tokens--
		return true, 0
	}
	return false, time.Duration((1 - b.tokens) / userRate * float64(time.Second))
}

// limitPerUser rejects a person who is sending requests faster than the cap.
func (a *App) limitPerUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if identity, ok := auth.IdentityFromContext(r.Context()); ok {
			if allowed, wait := a.limits.allow(identity.UserID); !allowed {
				w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(wait.Seconds()))))
				writeError(w, http.StatusTooManyRequests, "too_many_requests", "you are going too fast; try again in a moment")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
