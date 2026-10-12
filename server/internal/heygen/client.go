// Package heygen wraps the HeyGen v3 API calls this service makes: digital
// twin registration, consent, voices and avatar video generation.
//
// Endpoints and fields follow developers.heygen.com as read on 2026-10-12.
package heygen

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

const (
	providerName = "heygen"
	defaultBase  = "https://api.heygen.com/v3"
	maxBodyBytes = 4 << 20
)

type Client struct {
	apiKey string
	base   string
	http   *http.Client
}

func NewClient(apiKey string) *Client {
	return &Client{apiKey: apiKey, base: defaultBase, http: &http.Client{Timeout: 30 * time.Second}}
}

// WithBaseURL points the client elsewhere; used by tests.
func (c *Client) WithBaseURL(base string) *Client {
	clone := *c
	clone.base = strings.TrimRight(base, "/")
	return &clone
}

// do sends one request. idempotencyKey, when set, makes a retry within 24h
// replay the original response instead of creating a second resource.
func (c *Client) do(ctx context.Context, method, path string, q url.Values, body any, idempotencyKey string, out any) error {
	var reader io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(encoded)
	}
	endpoint := c.base + path
	if len(q) > 0 {
		endpoint += "?" + q.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, reader)
	if err != nil {
		return err
	}
	req.Header.Set("X-Api-Key", c.apiKey)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if idempotencyKey != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		// The URL is left out: it can carry identifiers that do not belong in logs.
		return &provider.Error{Provider: providerName, Message: "request failed", Transient: true}
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes+1))
	if err != nil {
		return &provider.Error{Provider: providerName, Message: "read response", Transient: true}
	}
	if len(data) > maxBodyBytes {
		return &provider.Error{Provider: providerName, Message: "response too large"}
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		pe := provider.FromHTTPStatus(providerName, resp.StatusCode, truncate(string(data), 300))
		pe.Code = errorCode(data)
		return pe
	}
	if method == http.MethodDelete && len(bytes.TrimSpace(data)) == 0 {
		return nil // a successful delete may have no body
	}
	if err := json.Unmarshal(data, out); err != nil {
		return &provider.Error{Provider: providerName, Status: resp.StatusCode, Message: "malformed response"}
	}
	return nil
}

func errorCode(body []byte) string {
	var e struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if json.Unmarshal(body, &e) == nil {
		return e.Error.Code
	}
	return ""
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

// HTTPStatus returns the HTTP status carried by a provider error, or 0.
func HTTPStatus(err error) int {
	var pe *provider.Error
	if errors.As(err, &pe) {
		return pe.Status
	}
	return 0
}
