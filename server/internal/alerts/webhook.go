package alerts

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
)

// Webhook posts an alert to a chat webhook. The payload carries both the
// "text" field Slack reads and the "content" field Discord reads.
type Webhook struct {
	url    provider.KeyFunc
	client *http.Client
}

// NewWebhook reads the address for each alert, so an admin can set or change it
// in the console without a restart. Until one is set, alerts are only stored.
// The client refuses private addresses, since the address is typed in.
func NewWebhook(url provider.KeyFunc) *Webhook {
	return &Webhook{url: url, client: safenet.NewClient(5 * time.Second)}
}

func (w *Webhook) Send(ctx context.Context, a Alert) error {
	text := fmt.Sprintf("Beyond Social alert (%s): %s. Seen %d time(s).", a.Kind, a.Message, a.Count)
	return w.Post(ctx, text)
}

// Post sends a line of text to the webhook. A webhook that is not set is not an error.
func (w *Webhook) Post(ctx context.Context, text string) error {
	url, err := w.url(ctx)
	if provider.Code(err) == provider.CodeNotConfigured {
		return nil
	}
	if err != nil {
		return err
	}
	return PostText(ctx, w.client, url, text)
}

// PostText posts one line to a Slack or Discord compatible webhook.
func PostText(ctx context.Context, client *http.Client, url, text string) error {
	body, _ := json.Marshal(map[string]string{"text": text, "content": text})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("alert webhook: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("alert webhook: status %d", resp.StatusCode)
	}
	return nil
}
