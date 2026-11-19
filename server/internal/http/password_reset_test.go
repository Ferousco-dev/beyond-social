package httpserver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type fakeRecovery struct {
	tokens map[string]string
	asked  chan string
}

func (f fakeRecovery) RecoveryToken(_ context.Context, email string) (string, bool, error) {
	f.asked <- email
	t, ok := f.tokens[email]
	return t, ok, nil
}

type fakeResetMail struct{ sent chan [2]string }

func (f fakeResetMail) PasswordReset(_ context.Context, to, token string) {
	f.sent <- [2]string{to, token}
}

func resetRequest(h http.Handler, body string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/password-reset", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	h.ServeHTTP(rec, req)
	return rec
}

func TestPasswordResetMailsOnlyKnownAddressesButAnswersAllTheSame(t *testing.T) {
	rec := fakeRecovery{tokens: map[string]string{"a@example.com": "tok1"}, asked: make(chan string, 4)}
	mail := fakeResetMail{sent: make(chan [2]string, 4)}
	app := NewApp(Deps{Recovery: rec, ResetMail: mail})
	h := app.Handler()

	known := resetRequest(h, `{"email":" A@Example.com "}`)
	unknown := resetRequest(h, `{"email":"nobody@example.com"}`)
	if known.Code != http.StatusAccepted || unknown.Code != known.Code || known.Body.String() != unknown.Body.String() {
		t.Fatalf("answers differ: %d %q vs %d %q", known.Code, known.Body, unknown.Code, unknown.Body)
	}
	select {
	case got := <-mail.sent:
		if got != [2]string{"a@example.com", "tok1"} {
			t.Fatalf("sent %v", got)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("the known address was not mailed")
	}
	time.Sleep(50 * time.Millisecond)
	select {
	case got := <-mail.sent:
		t.Fatalf("an unknown address was mailed: %v", got)
	default:
	}
}

func TestPasswordResetRefusesBadAddressesAndRepeatsWithinAMinute(t *testing.T) {
	rec := fakeRecovery{tokens: map[string]string{"a@example.com": "tok1"}, asked: make(chan string, 4)}
	mail := fakeResetMail{sent: make(chan [2]string, 4)}
	h := NewApp(Deps{Recovery: rec, ResetMail: mail}).Handler()

	if got := resetRequest(h, `{"email":"not an email"}`); got.Code != http.StatusBadRequest {
		t.Fatalf("bad address: %d", got.Code)
	}
	resetRequest(h, `{"email":"a@example.com"}`)
	<-mail.sent
	if got := resetRequest(h, `{"email":"a@example.com"}`); got.Code != http.StatusAccepted {
		t.Fatalf("repeat should still answer 202, got %d", got.Code)
	}
	time.Sleep(50 * time.Millisecond)
	select {
	case got := <-mail.sent:
		t.Fatalf("a repeat inside the cooldown was mailed again: %v", got)
	default:
	}
}

func TestPasswordResetIsUnavailableWithoutASender(t *testing.T) {
	h := NewApp(Deps{}).Handler()
	if got := resetRequest(h, `{"email":"a@example.com"}`); got.Code != http.StatusServiceUnavailable {
		t.Fatalf("got %d", got.Code)
	}
}
