package accounts

import (
	"sync"
	"time"
)

// recentTTL is how long a checked account is trusted without asking the
// database again. Every API request checks the account, and that check is a
// write (the profile is created on first sight), so without this each page
// load paid several round trips before doing any work. A suspension or
// deletion made here is applied at once (see Forget); one made elsewhere
// takes effect within this long.
const recentTTL = 15 * time.Second

type recentEntry struct {
	profile Profile
	details RegistrationDetails
	at      time.Time
}

// recent remembers accounts that just passed the active check.
type recent struct {
	mu      sync.Mutex
	entries map[string]recentEntry
	now     func() time.Time
}

func newRecent() *recent {
	return &recent{entries: map[string]recentEntry{}, now: time.Now}
}

// get returns a fresh profile checked with the same registration details.
func (r *recent) get(id string, details RegistrationDetails) (Profile, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	entry, ok := r.entries[id]
	if !ok || entry.details != details || r.now().Sub(entry.at) > recentTTL {
		return Profile{}, false
	}
	return entry.profile, true
}

func (r *recent) put(p Profile, details RegistrationDetails) {
	r.mu.Lock()
	defer r.mu.Unlock()
	// Old entries are dropped as new ones arrive, so the map stays the size
	// of the people using the product right now.
	for id, entry := range r.entries {
		if r.now().Sub(entry.at) > recentTTL {
			delete(r.entries, id)
		}
	}
	r.entries[p.ID] = recentEntry{profile: p, details: details, at: r.now()}
}

func (r *recent) forget(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.entries, id)
}
