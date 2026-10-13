package social

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

type tiktokSeen struct {
	forms   []url.Values
	init    map[string]any
	ranges  []string
	chunks  [][]byte
	auth    string
	initErr string
}

func fakeTikTok(t *testing.T, initCode string) (*TikTokProvider, *tiktokSeen) {
	t.Helper()
	seen := &tiktokSeen{}
	var srv *httptest.Server
	mux := http.NewServeMux()
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		seen.forms = append(seen.forms, r.PostForm)
		if r.PostForm.Get("code") == "bad" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		_, _ = w.Write([]byte(`{"access_token":"ta","refresh_token":"tr","expires_in":86400,"open_id":"open-1","scope":"user.info.basic,video.publish"}`))
	})
	mux.HandleFunc("/user", func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"data":{"user":{"display_name":"Ada"}}}`))
	})
	mux.HandleFunc("/revoke", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		seen.forms = append(seen.forms, r.PostForm)
	})
	mux.HandleFunc("/init", func(w http.ResponseWriter, r *http.Request) {
		seen.auth = r.Header.Get("Authorization")
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &seen.init)
		if initCode != "" {
			_, _ = w.Write([]byte(`{"error":{"code":"` + initCode + `"}}`))
			return
		}
		_, _ = w.Write([]byte(`{"data":{"publish_id":"pub-1","upload_url":"` + srv.URL + `/upload"},"error":{"code":"ok"}}`))
	})
	mux.HandleFunc("/upload", func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		seen.ranges = append(seen.ranges, r.Header.Get("Content-Range"))
		seen.chunks = append(seen.chunks, raw)
	})
	srv = httptest.NewTLSServer(mux)
	t.Cleanup(srv.Close)
	p := NewTikTok()
	p.http = srv.Client()
	p.tokenURL, p.revokeURL, p.userURL, p.initURL = srv.URL+"/token", srv.URL+"/revoke", srv.URL+"/user", srv.URL+"/init"
	return p, seen
}

func TestTikTokSignInSendsPKCEAndReadsTheName(t *testing.T) {
	p, seen := fakeTikTok(t, "")
	u, _ := url.Parse(p.AuthorizeURL(Credentials{ID: "ck"}, "https://api/cb", "st", "chal"))
	q := u.Query()
	if q.Get("client_key") != "ck" || q.Get("code_challenge_method") != "S256" || !strings.Contains(q.Get("scope"), "video.publish") {
		t.Fatalf("authorize query = %v", q)
	}
	tokens, account, err := p.Exchange(context.Background(), Credentials{ID: "ck", Secret: "cs"}, "https://api/cb", "good", "ver")
	if err != nil || tokens.Access != "ta" || tokens.Refresh != "tr" || tokens.ExpiresAt == nil || account.ID != "open-1" || account.Name != "Ada" {
		t.Fatalf("tokens=%+v account=%+v err=%v", tokens, account, err)
	}
	if f := seen.forms[0]; f.Get("code_verifier") != "ver" || f.Get("client_key") != "ck" || f.Get("grant_type") != "authorization_code" {
		t.Fatalf("form = %v", f)
	}
	if _, _, err := p.Exchange(context.Background(), Credentials{}, "x", "bad", "v"); err == nil {
		t.Fatal("a rejected code was accepted")
	}
	if renewed, err := p.Refresh(context.Background(), Credentials{ID: "ck", Secret: "cs"}, Tokens{Refresh: "tr"}); err != nil || renewed.Access != "ta" || seen.forms[len(seen.forms)-1].Get("refresh_token") != "tr" {
		t.Fatalf("refresh: %+v %v", renewed, err)
	}
}

func TestTikTokPublishOpensTheUploadThenSendsTheBytesInOrder(t *testing.T) {
	p, seen := fakeTikTok(t, "")
	in := PublishInput{Caption: "Rise early", Visibility: "private", Video: []byte("0123456789"), MIME: "video/mp4"}
	got, err := p.Publish(context.Background(), Tokens{Access: "ta"}, in)
	if err != nil || got.ID != "pub-1" {
		t.Fatalf("published = %+v err=%v", got, err)
	}
	post := seen.init["post_info"].(map[string]any)
	source := seen.init["source_info"].(map[string]any)
	if seen.auth != "Bearer ta" || post["privacy_level"] != "SELF_ONLY" || post["title"] != "Rise early" ||
		source["source"] != "FILE_UPLOAD" || source["video_size"] != float64(10) || source["total_chunk_count"] != float64(1) {
		t.Fatalf("init = %v", seen.init)
	}
	if len(seen.chunks) != 1 || string(seen.chunks[0]) != "0123456789" || seen.ranges[0] != "bytes 0-9/10" {
		t.Fatalf("chunks=%q ranges=%v", seen.chunks, seen.ranges)
	}
}

func TestTikTokExplainsAnUnauditedAppAndOtherRefusals(t *testing.T) {
	for code, want := range map[string]string{
		"unaudited_client_can_only_post_to_private_accounts": "not approved this app",
		"spam_risk_too_many_posts":                           "will not take more posts",
		"access_token_invalid":                               "no longer accepts",
		"something_new":                                      "refused the post",
	} {
		p, _ := fakeTikTok(t, code)
		_, err := p.Publish(context.Background(), Tokens{Access: "ta"}, PublishInput{Video: []byte("v"), MIME: "video/mp4"})
		var pe *provider.Error
		if !errors.As(err, &pe) || pe.Transient || !strings.Contains(pe.Message, want) {
			t.Errorf("%s: err = %v", code, err)
		}
	}
}

func TestTikTokPrivacyMapping(t *testing.T) {
	if tiktokPrivacy("private") != "SELF_ONLY" || tiktokPrivacy("unlisted") != "MUTUAL_FOLLOW_FRIENDS" || tiktokPrivacy("public") != "PUBLIC_TO_EVERYONE" || tiktokPrivacy("") != "PUBLIC_TO_EVERYONE" {
		t.Fatal("privacy mapping")
	}
}
