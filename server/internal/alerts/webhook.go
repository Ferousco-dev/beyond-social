package alerts

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Webhook posts an alert to a chat webhook. The payload carries both the
// "text" field Slack reads and the "content" field Discord reads.
type Webhook struct {
	URL    string
	client *http.Client
}

func NewWebhook(url string) *Webhook {
	return &Webhook{URL: url, client: &http.Client{Timeout: 5 * time.Second}}
}

func (w *Webhook) Send(ctx context.Context, a Alert) error {
	text := fmt.Sprintf("Beyond Social alert (%s): %s. Seen %d time(s).", a.Kind, a.Message, a.Count)
	body, _ := json.Marshal(map[string]string{"text": text, "content": text})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, w.URL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := w.client.Do(req)
	if err != nil {
		return fmt.Errorf("alert webhook: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("alert webhook: status %d", resp.StatusCode)
	}
	return nil
}
