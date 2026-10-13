package social

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

type igSeen struct {
	queries  []url.Values
	forms    []url.Values
	statuses []string
}

func fakeInstagram(t *testing.T, pages string, statuses ...string) (*InstagramProvider, *igSeen) {
	t.Helper()
	seen := &igSeen{statuses: statuses}
	mux := http.NewServeMux()
	mux.HandleFunc("/oauth/access_token", func(w http.ResponseWriter, r *http.Request) {
		seen.queries = append(seen.queries, r.URL.Query())
		if r.URL.Query().Get("code") == "bad" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		if r.URL.Query().Get("grant_type") == "fb_exchange_token" {
			_, _ = w.Write([]byte(`{"access_token":"long-token","expires_in":5184000}`))
			return
		}
		_, _ = w.Write([]byte(`{"access_token":"short-token","expires_in":3600}`))
	})
	mux.HandleFunc("/me/accounts", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(pages))
	})
	mux.HandleFunc("/me/permissions", func(w http.ResponseWriter, r *http.Request) {})
	mux.HandleFunc("/17841/media", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		seen.forms = append(seen.forms, r.PostForm)
		_, _ = w.Write([]byte(`{"id":"container-1"}`))
	})
	mux.HandleFunc("/container-1", func(w http.ResponseWriter, r *http.Request) {
		code := "FINISHED"
		if len(seen.statuses) > 0 {
			code, seen.statuses = seen.statuses[0], seen.statuses[1:]
		}
		_, _ = w.Write([]byte(`{"status_code":"` + code + `"}`))
	})
	mux.HandleFunc("/17841/media_publish", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		seen.forms = append(seen.forms, r.PostForm)
		_, _ = w.Write([]byte(`{"id":"media-9"}`))
	})
	mux.HandleFunc("/media-9", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"permalink":"https://www.instagram.com/reel/abc/"}`))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	p := NewInstagram()
	p.graph = srv.URL
	p.poll, p.limit = time.Millisecond, 200*time.Millisecond
	return p, seen
}

const linkedPage = `{"data":[{"id":"p0"},{"id":"p1","instagram_business_account":{"id":"17841","username":"ada.runs"}}]}`

func TestInstagramSignInTradesForALongLivedTokenAndFindsTheLinkedAccount(t *testing.T) {
	p, seen := fakeInstagram(t, linkedPage)
	tokens, account, err := p.Exchange(context.Background(), Credentials{ID: "app", Secret: "sec"}, "https://api/cb", "good", "")
	if err != nil || tokens.Access != "long-token" || tokens.Refresh != "" || tokens.ExpiresAt == nil || account.ID != "17841" || account.Name != "ada.runs" {
		t.Fatalf("tokens=%+v account=%+v err=%v", tokens, account, err)
	}
	if len(seen.queries) != 2 || seen.queries[1].Get("fb_exchange_token") != "short-token" {
		t.Fatalf("queries = %v", seen.queries)
	}
	if !strings.Contains(p.AuthorizeURL(Credentials{ID: "app"}, "https://api/cb", "st", "ignored"), "instagram_content_publish") {
		t.Fatal("the publishing permission is not requested")
	}
}

func TestInstagramNeedsALinkedBusinessAccountAndRefusesABadCode(t *testing.T) {
	p, _ := fakeInstagram(t, `{"data":[{"id":"p0"}]}`)
	if _, _, err := p.Exchange(context.Background(), Credentials{}, "x", "good", ""); err == nil || !strings.Contains(err.Error(), "business account") {
		t.Fatalf("err = %v", err)
	}
	if _, _, err := p.Exchange(context.Background(), Credentials{}, "x", "bad", ""); err == nil {
		t.Fatal("a rejected code was accepted")
	}
}

func TestInstagramRefreshExchangesTheCurrentTokenAndRevokeCallsPermissions(t *testing.T) {
	p, seen := fakeInstagram(t, linkedPage)
	renewed, err := p.Refresh(context.Background(), Credentials{ID: "a", Secret: "s"}, Tokens{Access: "old"})
	if err != nil || renewed.Access != "long-token" || seen.queries[0].Get("fb_exchange_token") != "old" {
		t.Fatalf("renewed=%+v err=%v queries=%v", renewed, err, seen.queries)
	}
	if err := p.Revoke(context.Background(), Tokens{Access: "old"}); err != nil {
		t.Fatal(err)
	}
}

func TestInstagramCreatesTheReelWaitsForItThenPublishes(t *testing.T) {
	p, seen := fakeInstagram(t, linkedPage, "IN_PROGRESS", "IN_PROGRESS", "FINISHED")
	got, err := p.Publish(context.Background(), Tokens{Access: "tok"}, PublishInput{
		Caption: "Rise early", VideoURL: "https://files.example/v.mp4?sig=1", AccountID: "17841",
	})
	if err != nil || got.ID != "media-9" || got.URL != "https://www.instagram.com/reel/abc/" {
		t.Fatalf("published = %+v err=%v", got, err)
	}
	create, publishForm := seen.forms[0], seen.forms[1]
	if create.Get("media_type") != "REELS" || create.Get("video_url") != "https://files.example/v.mp4?sig=1" || create.Get("caption") != "Rise early" || create.Get("access_token") != "tok" {
		t.Fatalf("create = %v", create)
	}
	if publishForm.Get("creation_id") != "container-1" {
		t.Fatalf("publish = %v", publishForm)
	}
}

func TestInstagramFailuresAreDefiniteOnlyWhenNothingCouldHaveBeenPublished(t *testing.T) {
	p, _ := fakeInstagram(t, linkedPage, "ERROR")
	_, err := p.Publish(context.Background(), Tokens{Access: "t"}, PublishInput{VideoURL: "https://f/v.mp4", AccountID: "17841"})
	var pe *provider.Error
	if !errors.As(err, &pe) || pe.Transient || !strings.Contains(pe.Message, "could not process") {
		t.Fatalf("a processing error: %v", err)
	}
	slow, _ := fakeInstagram(t, linkedPage, "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS", "IN_PROGRESS")
	slow.poll, slow.limit = 5*time.Millisecond, 20*time.Millisecond
	_, err = slow.Publish(context.Background(), Tokens{Access: "t"}, PublishInput{VideoURL: "https://f/v.mp4", AccountID: "17841"})
	if !errors.As(err, &pe) || !pe.Transient {
		t.Fatalf("waiting too long is ambiguous: %v", err)
	}
	if _, err := p.Publish(context.Background(), Tokens{Access: "t"}, PublishInput{VideoURL: "http://insecure/v.mp4", AccountID: "17841"}); err == nil {
		t.Fatal("an insecure video link was accepted")
	}
}
