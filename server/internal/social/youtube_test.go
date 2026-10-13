package social

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func fakeGoogle(t *testing.T, channels string) (*YouTubeProvider, *[]url.Values) {
	t.Helper()
	var forms []url.Values
	mux := http.NewServeMux()
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		forms = append(forms, r.PostForm)
		if r.PostForm.Get("code") == "bad" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		_, _ = w.Write([]byte(`{"access_token":"a1","refresh_token":"r1","expires_in":3600,"scope":"s1 s2"}`))
	})
	mux.HandleFunc("/revoke", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		forms = append(forms, r.PostForm)
	})
	mux.HandleFunc("/channels", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer a1" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		_, _ = w.Write([]byte(channels))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	p := NewYouTube()
	p.tokenURL, p.revokeURL, p.channelsURL = srv.URL+"/token", srv.URL+"/revoke", srv.URL+"/channels"
	return p, &forms
}

func TestYouTubeAuthorizeURLAsksForOfflineAccessWithPKCE(t *testing.T) {
	u, _ := url.Parse(NewYouTube().AuthorizeURL(Credentials{ID: "cid"}, "https://api/cb", "st", "chal"))
	q := u.Query()
	if q.Get("access_type") != "offline" || q.Get("prompt") != "consent" || q.Get("code_challenge_method") != "S256" ||
		q.Get("code_challenge") != "chal" || q.Get("state") != "st" || !strings.Contains(q.Get("scope"), "youtube.upload") {
		t.Fatalf("query = %v", q)
	}
}

func TestYouTubeExchangeSendsTheVerifierAndReadsTheChannel(t *testing.T) {
	p, forms := fakeGoogle(t, `{"items":[{"id":"UC123","snippet":{"title":"My Channel"}}]}`)
	tokens, account, err := p.Exchange(context.Background(), Credentials{ID: "cid", Secret: "sec"}, "https://api/cb", "good", "verifier-1")
	if err != nil || tokens.Access != "a1" || tokens.Refresh != "r1" || tokens.ExpiresAt == nil || len(tokens.Scopes) != 2 {
		t.Fatalf("tokens = %+v err=%v", tokens, err)
	}
	if account.ID != "UC123" || account.Name != "My Channel" {
		t.Fatalf("account = %+v", account)
	}
	if got := (*forms)[0]; got.Get("code_verifier") != "verifier-1" || got.Get("client_secret") != "sec" || got.Get("grant_type") != "authorization_code" {
		t.Fatalf("form = %v", got)
	}
}

func TestYouTubeRefusesAGoogleAccountWithoutAChannelAndABadCode(t *testing.T) {
	p, _ := fakeGoogle(t, `{"items":[]}`)
	if _, _, err := p.Exchange(context.Background(), Credentials{}, "x", "good", "v"); err == nil || !strings.Contains(err.Error(), "no YouTube channel") {
		t.Fatalf("err = %v", err)
	}
	if _, _, err := p.Exchange(context.Background(), Credentials{}, "x", "bad", "v"); err == nil {
		t.Fatal("a rejected code was accepted")
	}
}

func TestYouTubeRefreshAndRevoke(t *testing.T) {
	p, forms := fakeGoogle(t, `{}`)
	renewed, err := p.Refresh(context.Background(), Credentials{ID: "c", Secret: "s"}, Tokens{Refresh: "r0", Scopes: []string{"keep"}})
	if err != nil || renewed.Access != "a1" || (*forms)[0].Get("grant_type") != "refresh_token" || (*forms)[0].Get("refresh_token") != "r0" {
		t.Fatalf("renewed=%+v err=%v form=%v", renewed, err, *forms)
	}
	if err := p.Revoke(context.Background(), Tokens{Refresh: "r0", Access: "a0"}); err != nil || (*forms)[1].Get("token") != "r0" {
		t.Fatalf("revoke err=%v forms=%v", err, *forms)
	}
}
