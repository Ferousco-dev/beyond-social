package safenet

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestValidateURL(t *testing.T) {
	good := []string{"https://example.com/v.mp4", "https://cdn.tiktokcdn.com/a?b=c", "https://8.8.8.8/x"}
	bad := []string{
		"", "not a url", "http://example.com/v.mp4", "ftp://example.com/x", "file:///etc/passwd",
		"https://user:pass@example.com/x", "https://127.0.0.1/x", "https://[::1]/x", "https://10.0.0.5/x",
		"https://192.168.1.1/x", "https://172.16.0.1/x", "https://169.254.169.254/latest/meta-data",
		"https://100.64.0.1/x", "https://0.0.0.0/x", "https://[::ffff:127.0.0.1]/x", "https:///nohost",
	}
	for _, u := range good {
		if _, err := ValidateURL(u); err != nil {
			t.Errorf("%q should be allowed: %v", u, err)
		}
	}
	for _, u := range bad {
		if _, err := ValidateURL(u); !errors.Is(err, ErrBlockedURL) {
			t.Errorf("%q should be blocked, got %v", u, err)
		}
	}
}

func TestDialerBlocksPrivateAddressesAfterResolution(t *testing.T) {
	// A hostname that resolves to loopback must be stopped at connect time.
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("secret")) }))
	defer srv.Close()
	hostURL := strings.Replace(srv.URL, "127.0.0.1", "localhost", 1)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := Fetch(ctx, NewClient(5*time.Second), hostURL, 1<<20); err == nil {
		t.Fatal("fetching a name that resolves to loopback must fail")
	}
	if _, err := Fetch(ctx, NewClient(5*time.Second), srv.URL, 1<<20); !errors.Is(err, ErrBlockedURL) {
		t.Fatalf("literal loopback must be blocked, got %v", err)
	}
}

func TestReadCappedEnforcesLimit(t *testing.T) {
	if _, err := readCapped(strings.NewReader(strings.Repeat("a", 11)), 10); !errors.Is(err, ErrTooLarge) {
		t.Fatalf("expected ErrTooLarge, got %v", err)
	}
	if data, err := readCapped(strings.NewReader(strings.Repeat("a", 10)), 10); err != nil || len(data) != 10 {
		t.Fatalf("exact size should pass: %v", err)
	}
}

func TestSniffVideo(t *testing.T) {
	mp4 := append([]byte{0, 0, 0, 0x18}, []byte("ftypmp42")...)
	mov := append([]byte{0, 0, 0, 0x14}, []byte("ftypqt  ")...)
	mkv := []byte{0x1A, 0x45, 0xDF, 0xA3, 0x01, 0, 0, 0}
	for name, tc := range map[string]struct {
		data []byte
		want string
	}{"mp4": {mp4, "video/mp4"}, "mov": {mov, "video/quicktime"}, "mkv": {mkv, "video/x-matroska"}} {
		if got, err := SniffVideo(tc.data); err != nil || got != tc.want {
			t.Errorf("%s: got %q %v", name, got, err)
		}
	}
	for name, data := range map[string][]byte{
		"html": []byte("<html><body>nope</body></html>"), "empty": nil, "short": []byte("ftyp"), "png": []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\x0d"),
	} {
		if _, err := SniffVideo(data); !errors.Is(err, ErrBadMediaType) {
			t.Errorf("%s: expected ErrBadMediaType, got %v", name, err)
		}
	}
}
