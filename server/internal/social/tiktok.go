package social

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// TikTokProvider signs in with TikTok and posts through the Content Posting API.
// Until TikTok audits the app, it only lets posts go out as private, which the
// error message says plainly.
type TikTokProvider struct {
	http                                           *http.Client
	authURL, tokenURL, revokeURL, userURL, initURL string
	statusURL                                      string
}

func NewTikTok() *TikTokProvider {
	return &TikTokProvider{
		http:      &http.Client{Timeout: 30 * time.Second},
		authURL:   "https://www.tiktok.com/v2/auth/authorize/",
		tokenURL:  "https://open.tiktokapis.com/v2/oauth/token/",
		revokeURL: "https://open.tiktokapis.com/v2/oauth/revoke/",
		userURL:   "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
		initURL:   "https://open.tiktokapis.com/v2/post/publish/video/init/",
		statusURL: "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
	}
}

func (p *TikTokProvider) Platform() Platform { return TikTok }
func (p *TikTokProvider) Label() string      { return "TikTok" }

func (p *TikTokProvider) AuthorizeURL(c Credentials, redirectURI, state, challenge string) string {
	q := url.Values{
		"client_key": {c.ID}, "redirect_uri": {redirectURI}, "response_type": {"code"},
		"scope": {"user.info.basic,video.publish"}, "state": {state},
		"code_challenge": {challenge}, "code_challenge_method": {"S256"},
	}
	return p.authURL + "?" + q.Encode()
}

type tiktokToken struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	OpenID       string `json:"open_id"`
	Scope        string `json:"scope"`
}

func (t tiktokToken) tokens() Tokens {
	out := Tokens{Access: t.AccessToken, Refresh: t.RefreshToken, Scopes: strings.Split(t.Scope, ",")}
	if t.ExpiresIn > 0 {
		at := time.Now().Add(time.Duration(t.ExpiresIn) * time.Second)
		out.ExpiresAt = &at
	}
	return out
}

func (p *TikTokProvider) tokenRequest(ctx context.Context, form url.Values) (tiktokToken, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return tiktokToken{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	var tok tiktokToken
	if err := call(p.http, req, "tiktok", &tok); err != nil {
		return tiktokToken{}, err
	}
	if tok.AccessToken == "" {
		return tiktokToken{}, &provider.Error{Provider: "tiktok", Message: "no access token in the response"}
	}
	return tok, nil
}

func (p *TikTokProvider) Exchange(ctx context.Context, c Credentials, redirectURI, code, verifier string) (Tokens, Account, error) {
	tok, err := p.tokenRequest(ctx, url.Values{
		"client_key": {c.ID}, "client_secret": {c.Secret}, "code": {code}, "grant_type": {"authorization_code"},
		"redirect_uri": {redirectURI}, "code_verifier": {verifier},
	})
	if err != nil {
		return Tokens{}, Account{}, err
	}
	account := Account{ID: tok.OpenID, Name: "TikTok account"}
	if req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.userURL, nil); err == nil {
		req.Header.Set("Authorization", "Bearer "+tok.AccessToken)
		var info struct {
			Data struct {
				User struct {
					DisplayName string `json:"display_name"`
				} `json:"user"`
			} `json:"data"`
		}
		// The name is only for display, so a failure to read it does not fail sign-in.
		if call(p.http, req, "tiktok", &info) == nil && info.Data.User.DisplayName != "" {
			account.Name = info.Data.User.DisplayName
		}
	}
	return tok.tokens(), account, nil
}

func (p *TikTokProvider) Refresh(ctx context.Context, c Credentials, t Tokens) (Tokens, error) {
	tok, err := p.tokenRequest(ctx, url.Values{
		"client_key": {c.ID}, "client_secret": {c.Secret}, "grant_type": {"refresh_token"}, "refresh_token": {t.Refresh},
	})
	if err != nil {
		return Tokens{}, err
	}
	return tok.tokens(), nil
}

func (p *TikTokProvider) Revoke(ctx context.Context, t Tokens) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.revokeURL, strings.NewReader(url.Values{"token": {t.Access}}.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return call(p.http, req, "tiktok", nil)
}

// tiktokPrivacy maps our three choices onto TikTok's. An unaudited app can only
// use the private one, whatever is asked, and TikTok says so in its answer.
func tiktokPrivacy(v string) string {
	switch v {
	case "private":
		return "SELF_ONLY"
	case "unlisted":
		return "MUTUAL_FOLLOW_FRIENDS"
	}
	return "PUBLIC_TO_EVERYONE"
}

const (
	tiktokMinChunk = 5 << 20
	tiktokMaxChunk = 64 << 20
)

// Publish sends the video as a direct post: one request to open it, then the
// bytes in order.
func (p *TikTokProvider) Publish(ctx context.Context, t Tokens, in PublishInput) (Published, error) {
	size := len(in.Video)
	chunk := size
	if size > tiktokMaxChunk {
		chunk = tiktokMaxChunk
	}
	count := 1
	if chunk > 0 && size > chunk {
		count = (size + chunk - 1) / chunk
	}
	title := strings.TrimSpace(in.Caption)
	if title == "" {
		title = in.Title
	}
	body, _ := json.Marshal(map[string]any{
		"post_info":   map[string]any{"title": clipTo(title, 2200), "privacy_level": tiktokPrivacy(in.Visibility)},
		"source_info": map[string]any{"source": "FILE_UPLOAD", "video_size": size, "chunk_size": chunk, "total_chunk_count": count},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.initURL, bytes.NewReader(body))
	if err != nil {
		return Published{}, err
	}
	req.Header.Set("Authorization", "Bearer "+t.Access)
	req.Header.Set("Content-Type", "application/json; charset=UTF-8")
	var started struct {
		Data struct {
			PublishID string `json:"publish_id"`
			UploadURL string `json:"upload_url"`
		} `json:"data"`
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := call(p.http, req, "tiktok", &started); err != nil {
		return Published{}, tiktokRefusal(err)
	}
	if code := started.Error.Code; code != "" && code != "ok" {
		return Published{}, tiktokCode(code)
	}
	if started.Data.PublishID == "" || !strings.HasPrefix(started.Data.UploadURL, "https://") {
		return Published{}, &provider.Error{Provider: "tiktok", Message: "TikTok did not open an upload"}
	}
	for i := 0; i < count; i++ {
		start := i * chunk
		end := min(start+chunk, size)
		put, err := http.NewRequestWithContext(ctx, http.MethodPut, started.Data.UploadURL, bytes.NewReader(in.Video[start:end]))
		if err != nil {
			return Published{}, err
		}
		put.Header.Set("Content-Type", in.MIME)
		put.Header.Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end-1, size))
		if err := call(p.http, put, "tiktok", nil); err != nil {
			// Part of the video may have arrived, so this is never safe to retry.
			var pe *provider.Error
			if asProvider(err, &pe) {
				pe.Transient = true
			}
			return Published{}, err
		}
	}
	// TikTok processes the video after the upload; the post exists from here on.
	return Published{ID: started.Data.PublishID, URL: "https://www.tiktok.com/"}, nil
}

func tiktokRefusal(err error) error {
	var pe *provider.Error
	if asProvider(err, &pe) && pe.Status == http.StatusForbidden {
		return &provider.Error{Provider: "tiktok", Status: pe.Status, Message: "TikTok refused the post. The account may need to allow posting from this app."}
	}
	return err
}

// tiktokCode turns TikTok's error codes into something a person can act on.
func tiktokCode(code string) error {
	switch code {
	case "unaudited_client_can_only_post_to_private_accounts":
		return &provider.Error{Provider: "tiktok", Status: 403, Message: "TikTok has not approved this app for public posting yet, so posts can only go to private accounts."}
	case "spam_risk_too_many_posts", "reached_active_user_cap":
		return &provider.Error{Provider: "tiktok", Status: 429, Message: "TikTok will not take more posts right now. Try again later."}
	case "access_token_invalid", "scope_not_authorized":
		return &provider.Error{Provider: "tiktok", Status: 401, Message: "TikTok no longer accepts this sign-in"}
	}
	return &provider.Error{Provider: "tiktok", Status: 400, Message: "TikTok refused the post."}
}

func clipTo(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n])
}
