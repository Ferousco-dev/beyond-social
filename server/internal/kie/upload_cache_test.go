package kie

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type countingUploader struct {
	calls atomic.Int32
	fail  atomic.Bool
	gate  chan struct{}
}

func (u *countingUploader) Upload(_ context.Context, name, _ string, _ []byte) (string, error) {
	u.calls.Add(1)
	if u.gate != nil {
		<-u.gate
	}
	if u.fail.Load() {
		return "", errors.New("kie down")
	}
	return "https://kie.example/" + name, nil
}

func TestTheSameBytesAreSentOnce(t *testing.T) {
	up := &countingUploader{}
	c := NewUploadCache(up, time.Hour, 10)
	for range 5 {
		if url, err := c.Upload(context.Background(), "a.png", "image/png", []byte("same")); err != nil || url == "" {
			t.Fatalf("%q %v", url, err)
		}
	}
	if up.calls.Load() != 1 {
		t.Fatalf("uploaded %d times", up.calls.Load())
	}
}

func TestDifferentBytesOrTypesAreNeverMixedUp(t *testing.T) {
	up := &countingUploader{}
	c := NewUploadCache(up, time.Hour, 10)
	a, _ := c.Upload(context.Background(), "a.png", "image/png", []byte("one"))
	b, _ := c.Upload(context.Background(), "b.png", "image/png", []byte("two"))
	d, _ := c.Upload(context.Background(), "d.jpg", "image/jpeg", []byte("one"))
	if a == b || a == d || up.calls.Load() != 3 {
		t.Fatalf("a=%s b=%s d=%s calls=%d", a, b, d, up.calls.Load())
	}
}

func TestAFailedUploadIsNotRemembered(t *testing.T) {
	up := &countingUploader{}
	up.fail.Store(true)
	c := NewUploadCache(up, time.Hour, 10)
	if _, err := c.Upload(context.Background(), "a.png", "image/png", []byte("x")); err == nil {
		t.Fatal("want the error")
	}
	up.fail.Store(false)
	if url, err := c.Upload(context.Background(), "a.png", "image/png", []byte("x")); err != nil || url == "" {
		t.Fatalf("retry: %q %v", url, err)
	}
	if up.calls.Load() != 2 {
		t.Fatalf("calls = %d", up.calls.Load())
	}
}

func TestALinkIsNotReusedPastItsTime(t *testing.T) {
	up := &countingUploader{}
	c := NewUploadCache(up, time.Minute, 10)
	now := time.Now()
	c.now = func() time.Time { return now }
	_, _ = c.Upload(context.Background(), "a.png", "image/png", []byte("x"))
	now = now.Add(2 * time.Minute)
	_, _ = c.Upload(context.Background(), "a.png", "image/png", []byte("x"))
	if up.calls.Load() != 2 {
		t.Fatalf("calls = %d", up.calls.Load())
	}
}

func TestConcurrentRequestsShareOneUpload(t *testing.T) {
	up := &countingUploader{gate: make(chan struct{})}
	c := NewUploadCache(up, time.Hour, 10)
	var wg sync.WaitGroup
	for range 4 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = c.Upload(context.Background(), "a.png", "image/png", []byte("x"))
		}()
	}
	time.Sleep(50 * time.Millisecond)
	close(up.gate)
	wg.Wait()
	if up.calls.Load() != 1 {
		t.Fatalf("calls = %d", up.calls.Load())
	}
}

func TestTheCacheStaysWithinItsLimit(t *testing.T) {
	up := &countingUploader{}
	c := NewUploadCache(up, time.Hour, 3)
	for i := range 10 {
		_, _ = c.Upload(context.Background(), "f.png", "image/png", []byte{byte(i)})
	}
	c.mu.Lock()
	n := len(c.entries)
	c.mu.Unlock()
	if n > 3 {
		t.Fatalf("%d entries, limit 3", n)
	}
}
