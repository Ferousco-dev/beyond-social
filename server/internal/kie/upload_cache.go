package kie

import (
	"context"
	"crypto/sha256"
	"sync"
	"time"
)

// Uploader hosts a file at KIE and returns the link KIE serves it from.
type Uploader interface {
	Upload(ctx context.Context, fileName, mimeType string, data []byte) (string, error)
}

// UploadCache remembers where a file was hosted, so the same bytes are sent to
// KIE once, not once per request. A long video is many clips that all start
// from one picture; without this every clip sends it again, and the server pays
// for that outbound traffic each time.
//
// Files are matched by their content, never by name or owner, so one person's
// file can only ever be returned for identical bytes. Links are reused for less
// than KIE keeps a hosted file, and a failed upload is never remembered.
type UploadCache struct {
	next Uploader
	ttl  time.Duration
	max  int
	now  func() time.Time

	mu      sync.Mutex
	entries map[[sha256.Size]byte]*uploadEntry
}

type uploadEntry struct {
	done    chan struct{}
	url     string
	err     error
	expires time.Time
}

// NewUploadCache wraps next. ttl is how long a link is reused; max bounds how
// many files are remembered.
func NewUploadCache(next Uploader, ttl time.Duration, max int) *UploadCache {
	return &UploadCache{next: next, ttl: ttl, max: max, now: time.Now, entries: map[[sha256.Size]byte]*uploadEntry{}}
}

// Upload returns the link for these bytes, uploading only when none is known.
// Concurrent requests for the same bytes share one upload.
func (c *UploadCache) Upload(ctx context.Context, fileName, mimeType string, data []byte) (string, error) {
	key := sha256.Sum256(append([]byte(mimeType+"\x00"), data...))

	c.mu.Lock()
	if hit, ok := c.entries[key]; ok {
		select {
		case <-hit.done:
			if hit.err == nil && c.now().Before(hit.expires) {
				c.mu.Unlock()
				return hit.url, nil
			}
			delete(c.entries, key)
		default:
			// Another request is uploading these bytes: wait for it.
			c.mu.Unlock()
			select {
			case <-hit.done:
				if hit.err == nil {
					return hit.url, nil
				}
			case <-ctx.Done():
				return "", ctx.Err()
			}
			return c.next.Upload(ctx, fileName, mimeType, data)
		}
	}
	c.evict()
	entry := &uploadEntry{done: make(chan struct{})}
	c.entries[key] = entry
	c.mu.Unlock()

	url, err := c.next.Upload(ctx, fileName, mimeType, data)
	c.mu.Lock()
	entry.url, entry.err, entry.expires = url, err, c.now().Add(c.ttl)
	if err != nil {
		delete(c.entries, key)
	}
	c.mu.Unlock()
	close(entry.done)
	return url, err
}

// evict makes room for one more entry, dropping expired files first and then
// the soonest to expire. The caller holds the lock.
func (c *UploadCache) evict() {
	if len(c.entries) < c.max {
		return
	}
	now := c.now()
	var oldestKey [sha256.Size]byte
	var oldest time.Time
	first := true
	for key, entry := range c.entries {
		select {
		case <-entry.done:
		default:
			continue // still uploading
		}
		if !now.Before(entry.expires) {
			delete(c.entries, key)
			continue
		}
		if first || entry.expires.Before(oldest) {
			oldestKey, oldest, first = key, entry.expires, false
		}
	}
	if len(c.entries) >= c.max && !first {
		delete(c.entries, oldestKey)
	}
}
