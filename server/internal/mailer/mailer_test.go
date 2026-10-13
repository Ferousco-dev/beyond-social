package mailer

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

type sentMail struct {
	mu   sync.Mutex
	sent []Message
	err  error
}

func (s *sentMail) Send(_ context.Context, m Message) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.err != nil {
		return s.err
	}
	s.sent = append(s.sent, m)
	return nil
}

type fixedEmail map[string]string

func (f fixedEmail) Email(_ context.Context, id string) (string, error) {
	if e, ok := f[id]; ok {
		return e, nil
	}
	return "", errors.New("no such user")
}

func TestResendSendsTheMessageWithTheKeyAndFrom(t *testing.T) {
	var got map[string]any
	var auth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth = r.Header.Get("Authorization")
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &got)
		_, _ = w.Write([]byte(`{"id":"e1"}`))
	}))
	defer server.Close()
	send := NewResend(provider.StaticKey("re_test"), func(context.Context) string { return "" }).WithURL(server.URL)
	if err := send.Send(context.Background(), Message{To: "a@example.com", Subject: "Hi", Text: "Body"}); err != nil {
		t.Fatal(err)
	}
	if auth != "Bearer re_test" || got["from"] != DefaultFrom || got["subject"] != "Hi" || got["text"] != "Body" {
		t.Fatalf("auth=%q body=%v", auth, got)
	}
	if to := got["to"].([]any); len(to) != 1 || to[0] != "a@example.com" {
		t.Fatalf("to = %v", got["to"])
	}
}

func TestResendFailuresAreClassified(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusUnprocessableEntity) }))
	defer server.Close()
	send := NewResend(provider.StaticKey("k"), func(context.Context) string { return "Me <me@example.com>" }).WithURL(server.URL)
	if err := send.Send(context.Background(), Message{To: "a@example.com"}); err == nil || provider.IsTransient(err) {
		t.Fatalf("err = %v", err)
	}
	noKey := NewResend(func(context.Context) (string, error) { return "", provider.ErrNotConfigured("resend") }, func(context.Context) string { return "" })
	if err := noKey.Send(context.Background(), Message{}); provider.Code(err) != provider.CodeNotConfigured {
		t.Fatalf("err = %v", err)
	}
}

func TestEmailsNameTheRightPlaceAndNeverFailTheCaller(t *testing.T) {
	mail := &sentMail{}
	n := NewNotifier(mail, fixedEmail{"u1": "a@example.com"}, "https://app.example").Inline()

	n.PackBought("u1", "Starter", 200, 1000, "usd")
	n.ProStarted("u1")
	n.PaymentFailed("u1")
	n.ProEnded("u1")
	n.LimitReached("u1", "five_hour", time.Date(2026, 10, 14, 15, 0, 0, 0, time.UTC))
	n.LimitReached("u1", "week", time.Date(2026, 10, 19, 0, 0, 0, 0, time.UTC))
	if len(mail.sent) != 6 {
		t.Fatalf("sent %d, want 6", len(mail.sent))
	}
	for _, m := range mail.sent {
		if m.To != "a@example.com" || m.Subject == "" || !strings.Contains(m.Text, "https://app.example/") {
			t.Errorf("bad message: %+v", m)
		}
	}
	if !strings.Contains(mail.sent[0].Text, "200 credits") || !strings.Contains(mail.sent[0].Text, "USD 10.00") {
		t.Errorf("receipt: %s", mail.sent[0].Text)
	}
	if !strings.Contains(mail.sent[4].Text, "five hour session") || !strings.Contains(mail.sent[5].Text, "weekly") {
		t.Errorf("limit texts: %q / %q", mail.sent[4].Text, mail.sent[5].Text)
	}

	// An unknown user, or a sender that fails, must not panic or return an error to anyone.
	n.ProStarted("nobody")
	mail.err = errors.New("resend is down")
	n.ProStarted("u1")
	mail.err = provider.ErrNotConfigured("resend")
	n.ProStarted("u1")
	if len(mail.sent) != 6 {
		t.Fatalf("a failed send was counted: %d", len(mail.sent))
	}
}
