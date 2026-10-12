// Package kie wraps the KIE AI endpoints used for video-to-video generation:
// file upload, task creation, task lookup, and callback signature checks.
package kie

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

const (
	providerName   = "kie"
	defaultAPIBase = "https://api.kie.ai"
	defaultUpBase  = "https://kieai.redpandaai.co"
	maxBodyBytes   = 4 << 20

	// Model is the video-to-video model identifier from the KIE docs.
	Model = "wan/2-6-video-to-video"
	// MaxInputBytes is the documented per-video limit for this model.
	MaxInputBytes = 10 << 20
)

type Client struct {
	apiKey  string
	apiBase string
	upBase  string
	http    *http.Client
}

func NewClient(apiKey string) *Client {
	return &Client{apiKey: apiKey, apiBase: defaultAPIBase, upBase: defaultUpBase, http: &http.Client{Timeout: 60 * time.Second}}
}

// WithBaseURLs points the client elsewhere; used by tests.
func (c *Client) WithBaseURLs(api, upload string) *Client {
	clone := *c
	clone.apiBase, clone.upBase = strings.TrimRight(api, "/"), strings.TrimRight(upload, "/")
	return &clone
}

type TaskRequest struct {
	Prompt      string
	VideoURL    string
	Duration    string // "5" or "10"
	Resolution  string // "720p" or "1080p"
	CallbackURL string
}

type State string

const (
	StatePending State = "pending" // waiting, queuing or generating
	StateSuccess State = "success"
	StateFailed  State = "fail"
)

type Task struct {
	ID         string
	State      State
	Progress   int
	ResultURLs []string
	FailCode   string
	FailMsg    string
}

// Upload stores a file at KIE (kept for 24 hours) and returns a URL the
// generation API can read. It is the controlled alternative to handing KIE a
// third-party CDN link that may expire, block it, or require cookies.
func (c *Client) Upload(ctx context.Context, fileName, mimeType string, data []byte) (string, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, err := w.CreatePart(map[string][]string{
		"Content-Disposition": {fmt.Sprintf(`form-data; name="file"; filename=%q`, fileName)},
		"Content-Type":        {mimeType},
	})
	if err != nil {
		return "", err
	}
	_, _ = part.Write(data)
	_ = w.WriteField("uploadPath", "beyond-social/source")
	_ = w.WriteField("fileName", fileName)
	if err := w.Close(); err != nil {
		return "", err
	}

	var out struct {
		Success bool   `json:"success"`
		Code    int    `json:"code"`
		Msg     string `json:"msg"`
		Data    struct {
			DownloadURL string `json:"downloadUrl"`
		} `json:"data"`
	}
	if err := c.do(ctx, http.MethodPost, c.upBase+"/api/file-stream-upload", w.FormDataContentType(), &buf, &out); err != nil {
		return "", err
	}
	if !out.Success || out.Code != 200 || !strings.HasPrefix(out.Data.DownloadURL, "https://") {
		return "", classify(out.Code, out.Msg)
	}
	return out.Data.DownloadURL, nil
}

func (c *Client) CreateTask(ctx context.Context, r TaskRequest) (string, error) {
	input := map[string]any{
		"prompt": r.Prompt, "video_urls": []string{r.VideoURL},
		"duration": r.Duration, "resolution": r.Resolution,
	}
	payload := map[string]any{"model": Model, "input": input}
	if r.CallbackURL != "" {
		payload["callBackUrl"] = r.CallbackURL
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	var out struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			TaskID string `json:"taskId"`
		} `json:"data"`
	}
	if err := c.do(ctx, http.MethodPost, c.apiBase+"/api/v1/jobs/createTask", "application/json", bytes.NewReader(body), &out); err != nil {
		return "", err
	}
	if out.Code != 200 || out.Data.TaskID == "" {
		return "", classify(out.Code, out.Msg)
	}
	return out.Data.TaskID, nil
}

func (c *Client) do(ctx context.Context, method, endpoint, contentType string, body io.Reader, out any) error {
	req, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	resp, err := c.http.Do(req)
	if err != nil {
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
		return provider.FromHTTPStatus(providerName, resp.StatusCode, truncate(string(data), 300))
	}
	if err := json.Unmarshal(data, out); err != nil {
		return &provider.Error{Provider: providerName, Status: resp.StatusCode, Message: "malformed response"}
	}
	return nil
}

// classify maps KIE's in-body status code. KIE answers HTTP 200 for most
// failures and reports the real status in `code`.
func classify(code int, msg string) *provider.Error {
	return provider.FromHTTPStatus(providerName, code, truncate(msg, 300))
}

func clamp(n int) int { return max(0, min(n, 100)) }

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
