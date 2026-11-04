// Package mailer sends the product's own emails: receipts, billing problems and
// limit notices. Sign-in emails are Supabase's and are not sent from here.
package mailer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

const (
	resendURL   = "https://api.resend.com/emails"
	sendTimeout = 15 * time.Second
	// DefaultFrom is Resend's shared test sender. It only delivers to the account
	// owner, so an admin sets a real address once a domain is verified.
	DefaultFrom = "Beyond Social <onboarding@resend.dev>"
)

type Message struct {
	To      string
	Subject string
	Text    string
}

type Sender interface {
	Send(ctx context.Context, m Message) error
}

// Resend sends through resend.com. The key and the from address are read for
// each message, so an admin can change either in the console without a restart.
type Resend struct {
	key  provider.KeyFunc
	from func(ctx context.Context) string
	url  string
	http *http.Client
}

func NewResend(key provider.KeyFunc, from func(ctx context.Context) string) *Resend {
	return &Resend{key: key, from: from, url: resendURL, http: &http.Client{Timeout: sendTimeout}}
}

// WithURL points the sender somewhere else, for tests.
func (r *Resend) WithURL(url string) *Resend {
	r.url = url
	return r
}

func (r *Resend) Send(ctx context.Context, m Message) error {
	key, err := r.key(ctx)
	if err != nil {
		return err
	}
	from := r.from(ctx)
	if from == "" {
		from = DefaultFrom
	}
	body, err := json.Marshal(map[string]any{"from": from, "to": []string{m.To}, "subject": m.Subject, "text": m.Text})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")
	resp, err := r.http.Do(req)
	if err != nil {
		return &provider.Error{Provider: "resend", Message: "request failed", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, 300))
		return provider.FromHTTPStatus("resend", resp.StatusCode, fmt.Sprintf("send refused: %s", detail))
	}
	return nil
}

// Emails finds where to write to a person.
type Emails interface {
	Email(ctx context.Context, userID string) (string, error)
}

// Notifier sends the emails billing and usage events call for. Sending is best
// effort and in the background: an email problem must never fail a payment, a
// request, or a webhook, so errors are logged and nothing more.
type Notifier struct {
	sender Sender
	emails Emails
	appURL string
	wait   func(func()) // runs a send; a test replaces it to run inline
}

func NewNotifier(sender Sender, emails Emails, appURL string) *Notifier {
	return &Notifier{sender: sender, emails: emails, appURL: appURL, wait: func(f func()) { go f() }}
}

// Inline makes sends run before the call returns, for tests.
func (n *Notifier) Inline() *Notifier {
	n.wait = func(f func()) { f() }
	return n
}

func (n *Notifier) send(userID string, compose func() (subject, text string)) {
	n.wait(func() {
		ctx, cancel := context.WithTimeout(context.Background(), sendTimeout)
		defer cancel()
		to, err := n.emails.Email(ctx, userID)
		if err != nil || to == "" {
			slog.Warn("email skipped: no address", "user", userID, "error", err)
			return
		}
		subject, text := compose()
		if err := n.sender.Send(ctx, Message{To: to, Subject: subject, Text: text}); err != nil {
			// A missing key just means the admin has not set email up yet.
			if provider.Code(err) == provider.CodeNotConfigured {
				slog.Info("email not sent: no email key is set", "subject", subject)
				return
			}
			slog.Error("send email", "subject", subject, "error", err)
		}
	})
}
