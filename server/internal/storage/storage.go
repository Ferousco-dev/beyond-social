// Package storage talks to Supabase Storage with the service role, to hand a
// private recording to HeyGen through a short-lived signed URL and to delete it
// afterwards.
package storage

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

const providerName = "supabase-storage"

var (
	ErrBadPath  = errors.New("invalid storage path")
	ErrNotFound = errors.New("object not found")

	pathPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]*(/[A-Za-z0-9][A-Za-z0-9._-]*)*$`)
)

type Client struct {
	base       string // e.g. https://x.supabase.co/storage/v1
	serviceKey string
	http       *http.Client
}

func NewClient(supabaseURL, serviceRoleKey string) *Client {
	return &Client{
		base:       strings.TrimRight(supabaseURL, "/") + "/storage/v1",
		serviceKey: serviceRoleKey,
		http:       &http.Client{Timeout: 20 * time.Second},
	}
}

// Info is what is known about a stored object without downloading it.
type Info struct {
	Size        int64 // -1 when the server did not say
	ContentType string
}

func objectPath(bucket, path string) (string, error) {
	if !pathPattern.MatchString(path) || strings.Contains(path, "..") || !pathPattern.MatchString(bucket) {
		return "", ErrBadPath
	}
	segments := strings.Split(path, "/")
	for i, s := range segments {
		segments[i] = url.PathEscape(s)
	}
	return url.PathEscape(bucket) + "/" + strings.Join(segments, "/"), nil
}

// SignedURL returns a URL that lets the holder download the object until ttl passes.
func (c *Client) SignedURL(ctx context.Context, bucket, path string, ttl time.Duration) (string, error) {
	p, err := objectPath(bucket, path)
	if err != nil {
		return "", err
	}
	body, _ := json.Marshal(map[string]int{"expiresIn": int(ttl.Seconds())})
	var out struct {
		SignedURL string `json:"signedURL"`
	}
	if err := c.do(ctx, http.MethodPost, "/object/sign/"+p, body, &out); err != nil {
		return "", err
	}
	signed := c.base + "/" + strings.TrimPrefix(out.SignedURL, "/")
	// Only ever hand out a URL on the same host the request went to.
	want, _ := url.Parse(c.base)
	got, err := url.Parse(signed)
	if err != nil || got.Host != want.Host {
		return "", &provider.Error{Provider: providerName, Message: "signed url on unexpected host"}
	}
	return signed, nil
}

// Stat reports the size and type of an object, or ErrNotFound.
func (c *Client) Stat(ctx context.Context, bucket, path string) (Info, error) {
	p, err := objectPath(bucket, path)
	if err != nil {
		return Info{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodHead, c.base+"/object/info/"+p, nil)
	if err != nil {
		return Info{}, err
	}
	c.auth(req)
	resp, err := c.http.Do(req)
	if err != nil {
		return Info{}, &provider.Error{Provider: providerName, Message: "request failed", Transient: true}
	}
	defer resp.Body.Close()
	switch {
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusBadRequest:
		return Info{}, ErrNotFound
	case resp.StatusCode != http.StatusOK:
		return Info{}, provider.FromHTTPStatus(providerName, resp.StatusCode, "stat failed")
	}
	info := Info{Size: -1, ContentType: strings.ToLower(strings.TrimSpace(strings.SplitN(resp.Header.Get("Content-Type"), ";", 2)[0]))}
	if n, err := strconv.ParseInt(resp.Header.Get("Content-Length"), 10, 64); err == nil {
		info.Size = n
	}
	return info, nil
}

// Delete removes an object. One that is already gone is not an error.
func (c *Client) Delete(ctx context.Context, bucket, path string) error {
	p, err := objectPath(bucket, path)
	if err != nil {
		return err
	}
	err = c.do(ctx, http.MethodDelete, "/object/"+p, nil, &struct{}{})
	var pe *provider.Error
	if errors.As(err, &pe) && pe.Status == http.StatusNotFound {
		return nil
	}
	return err
}

func (c *Client) auth(req *http.Request) {
	req.Header.Set("Authorization", "Bearer "+c.serviceKey)
	req.Header.Set("apikey", c.serviceKey)
}

func (c *Client) do(ctx context.Context, method, path string, body []byte, out any) error {
	req, err := http.NewRequestWithContext(ctx, method, c.base+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	c.auth(req)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return &provider.Error{Provider: providerName, Message: "request failed", Transient: true}
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return provider.FromHTTPStatus(providerName, resp.StatusCode, fmt.Sprintf("status %d", resp.StatusCode))
	}
	if err := json.Unmarshal(data, out); err != nil {
		return &provider.Error{Provider: providerName, Status: resp.StatusCode, Message: "malformed response"}
	}
	return nil
}

// SignedUploadToken returns a one-time token that lets a browser upload one
// object to exactly this path, without holding any key of ours. The token is
// the authority, so the path is decided by the caller of this method.
func (c *Client) SignedUploadToken(ctx context.Context, bucket, path string) (string, error) {
	p, err := objectPath(bucket, path)
	if err != nil {
		return "", err
	}
	var out struct {
		URL   string `json:"url"`
		Token string `json:"token"`
	}
	if err := c.do(ctx, http.MethodPost, "/object/upload/sign/"+p, []byte("{}"), &out); err != nil {
		return "", err
	}
	token := out.Token
	if token == "" {
		if u, err := url.Parse(out.URL); err == nil {
			token = u.Query().Get("token")
		}
	}
	if token == "" {
		return "", &provider.Error{Provider: providerName, Message: "no upload token in response"}
	}
	return token, nil
}
