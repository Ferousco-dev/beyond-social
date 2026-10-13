// Package safenet fetches untrusted URLs without letting them reach private
// networks. User input and provider output both end up here, so nothing is
// trusted: addresses are checked at connect time (which also defeats DNS
// rebinding), redirects are bounded and re-checked, and bodies are size capped.
package safenet

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"syscall"
	"time"
)

var (
	ErrBlockedURL   = errors.New("url is not allowed")
	ErrTooLarge     = errors.New("response exceeds the size limit")
	ErrBadMediaType = errors.New("unsupported media type")
)

const maxRedirects = 3

// ValidateURL accepts only absolute https URLs with a public-looking host.
// It is a cheap early rejection; the dialer is what actually enforces safety.
func ValidateURL(raw string) (*url.URL, error) {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil {
		return nil, ErrBlockedURL
	}
	if addr, err := netip.ParseAddr(u.Hostname()); err == nil && !publicAddr(addr) && !sandboxAddr(addr) {
		return nil, ErrBlockedURL
	}
	return u, nil
}

func publicAddr(a netip.Addr) bool {
	a = a.Unmap()
	return a.IsValid() && !a.IsLoopback() && !a.IsPrivate() && !a.IsLinkLocalUnicast() &&
		!a.IsLinkLocalMulticast() && !a.IsMulticast() && !a.IsUnspecified() && !a.IsInterfaceLocalMulticast() &&
		!cgnat.Contains(a)
}

func sandboxAddr(a netip.Addr) bool { return allowLoopback.Load() && a.Unmap().IsLoopback() }

func sandboxTLS() *tls.Config {
	if roots := sandboxRoots.Load(); roots != nil {
		return &tls.Config{RootCAs: roots, MinVersion: tls.VersionTLS12}
	}
	return nil
}

// 100.64.0.0/10 is shared address space used for carrier NAT and some cloud metadata.
var cgnat = netip.MustParsePrefix("100.64.0.0/10")

// control runs after DNS resolution on the exact address being dialled.
func control(_, address string, _ syscall.RawConn) error {
	host, _, err := net.SplitHostPort(address)
	if err != nil {
		return ErrBlockedURL
	}
	addr, err := netip.ParseAddr(host)
	if err != nil || (!publicAddr(addr) && !sandboxAddr(addr)) {
		return fmt.Errorf("%w: non-public address", ErrBlockedURL)
	}
	return nil
}

// NewClient returns an HTTP client for untrusted hosts. It sends no ambient
// credentials and refuses downgrades to http or redirects into private space.
func NewClient(timeout time.Duration) *http.Client {
	dialer := &net.Dialer{Timeout: 10 * time.Second, Control: control}
	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			DialContext:           dialer.DialContext,
			Proxy:                 nil,
			TLSHandshakeTimeout:   10 * time.Second,
			ResponseHeaderTimeout: 20 * time.Second,
			MaxIdleConns:          10,
			DisableCompression:    true,
			TLSClientConfig:       sandboxTLS(),
		},
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) > maxRedirects {
				return errors.New("too many redirects")
			}
			if _, err := ValidateURL(req.URL.String()); err != nil {
				return err
			}
			return nil
		},
	}
}

// Fetch downloads rawURL, refusing anything over maxBytes.
func Fetch(ctx context.Context, client *http.Client, rawURL string, maxBytes int64) ([]byte, error) {
	u, err := ValidateURL(rawURL)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; BeyondSocial/1.0)")
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch media: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch media: status %d", resp.StatusCode)
	}
	if resp.ContentLength > maxBytes {
		return nil, ErrTooLarge
	}
	return readCapped(resp.Body, maxBytes)
}

// Fetcher is a ready-to-use downloader built on NewClient.
type Fetcher struct{ client *http.Client }

func NewFetcher(timeout time.Duration) Fetcher { return Fetcher{client: NewClient(timeout)} }

func (f Fetcher) Fetch(ctx context.Context, rawURL string, maxBytes int64) ([]byte, error) {
	return Fetch(ctx, f.client, rawURL, maxBytes)
}
