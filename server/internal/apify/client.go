// Package apify wraps the parts of the Apify REST API this service uses:
// start an actor run, poll it, and read its dataset.
package apify

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

const (
	providerName = "apify"
	defaultBase  = "https://api.apify.com/v2"
	maxBodyBytes = 16 << 20
)

// Run statuses as documented by Apify.
const (
	StatusReady     = "READY"
	StatusRunning   = "RUNNING"
	StatusSucceeded = "SUCCEEDED"
	StatusFailed    = "FAILED"
	StatusTimingOut = "TIMING-OUT"
	StatusTimedOut  = "TIMED-OUT"
	StatusAborting  = "ABORTING"
	StatusAborted   = "ABORTED"
)

type Run struct {
	ID               string `json:"id"`
	Status           string `json:"status"`
	DefaultDatasetID string `json:"defaultDatasetId"`
}

// Finished reports whether the run has reached a state it will not leave.
func (r Run) Finished() bool {
	switch r.Status {
	case StatusSucceeded, StatusFailed, StatusTimedOut, StatusAborted:
		return true
	}
	return false
}

type RunOptions struct {
	MaxItems       int
	MaxChargeUSD   float64
	TimeoutSeconds int
}

// API is the slice of the client that processors depend on, so they can be
// tested without HTTP.
type API interface {
	StartRun(ctx context.Context, actor string, input any, opts RunOptions) (Run, error)
	GetRun(ctx context.Context, runID string, waitSeconds int) (Run, error)
	Items(ctx context.Context, datasetID string, limit int) ([]json.RawMessage, error)
}

type Client struct {
	key  provider.KeyFunc
	base string
	http *http.Client
}

func NewClient(token string) *Client { return NewClientWithKey(provider.StaticKey(token)) }

// NewClientWithKey reads its token on every request.
func NewClientWithKey(key provider.KeyFunc) *Client {
	return &Client{key: key, base: defaultBase, http: &http.Client{Timeout: 30 * time.Second}}
}

// WithBaseURL points the client elsewhere; used by tests.
func (c *Client) WithBaseURL(base string) *Client {
	clone := *c
	clone.base = strings.TrimRight(base, "/")
	return &clone
}

func (c *Client) StartRun(ctx context.Context, actor string, input any, opts RunOptions) (Run, error) {
	body, err := json.Marshal(input)
	if err != nil {
		return Run{}, fmt.Errorf("encode actor input: %w", err)
	}
	q := url.Values{}
	if opts.MaxItems > 0 {
		q.Set("maxItems", strconv.Itoa(opts.MaxItems))
	}
	if opts.MaxChargeUSD > 0 {
		q.Set("maxTotalChargeUsd", strconv.FormatFloat(opts.MaxChargeUSD, 'f', 2, 64))
	}
	if opts.TimeoutSeconds > 0 {
		q.Set("timeout", strconv.Itoa(opts.TimeoutSeconds))
	}
	var out struct {
		Data Run `json:"data"`
	}
	path := "/actors/" + url.PathEscape(strings.Replace(actor, "/", "~", 1)) + "/runs"
	if err := c.do(ctx, http.MethodPost, path, q, body, &out); err != nil {
		return Run{}, err
	}
	if out.Data.ID == "" {
		return Run{}, &provider.Error{Provider: providerName, Message: "run response had no id"}
	}
	return out.Data, nil
}

// GetRun reads a run. waitSeconds (0-60) lets Apify hold the request until the run finishes.
func (c *Client) GetRun(ctx context.Context, runID string, waitSeconds int) (Run, error) {
	q := url.Values{}
	if waitSeconds > 0 {
		q.Set("waitForFinish", strconv.Itoa(min(waitSeconds, 60)))
	}
	var out struct {
		Data Run `json:"data"`
	}
	if err := c.do(ctx, http.MethodGet, "/actor-runs/"+url.PathEscape(runID), q, nil, &out); err != nil {
		return Run{}, err
	}
	return out.Data, nil
}

// Items returns up to limit raw dataset rows. Rows stay raw because each actor
// has its own shape; normalisation happens per platform.
func (c *Client) Items(ctx context.Context, datasetID string, limit int) ([]json.RawMessage, error) {
	q := url.Values{"clean": {"true"}, "limit": {strconv.Itoa(limit)}}
	var rows []json.RawMessage
	if err := c.do(ctx, http.MethodGet, "/datasets/"+url.PathEscape(datasetID)+"/items", q, nil, &rows); err != nil {
		return nil, err
	}
	return rows, nil
}

func (c *Client) do(ctx context.Context, method, path string, q url.Values, body []byte, out any) error {
	endpoint := c.base + path
	if len(q) > 0 {
		endpoint += "?" + q.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	token, err := c.key(ctx)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return &provider.Error{Provider: providerName, Message: "request failed: " + redact(err), Transient: true}
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes+1))
	if err != nil {
		return &provider.Error{Provider: providerName, Message: "read response: " + redact(err), Transient: true}
	}
	if len(data) > maxBodyBytes {
		return &provider.Error{Provider: providerName, Message: "response too large"}
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return provider.FromHTTPStatus(providerName, resp.StatusCode, truncate(string(data), 300))
	}
	if err := json.Unmarshal(data, out); err != nil {
		return &provider.Error{Provider: providerName, Status: resp.StatusCode, Message: "malformed response: " + err.Error()}
	}
	return nil
}

// redact keeps URLs (which can carry tokens in query strings) out of logs.
func redact(err error) string {
	var ue *url.Error
	if errors.As(err, &ue) {
		return ue.Op + ": " + ue.Err.Error()
	}
	return err.Error()
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
