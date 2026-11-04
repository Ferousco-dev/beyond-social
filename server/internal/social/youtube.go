package social

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// YouTubeProvider signs in with Google and reads the channel's name.
type YouTubeProvider struct {
	http                                      *http.Client
	authURL, tokenURL, revokeURL, channelsURL string
	uploadURL                                 string
}

func NewYouTube() *YouTubeProvider {
	return &YouTubeProvider{
		http:        &http.Client{Timeout: 20 * time.Second},
		authURL:     "https://accounts.google.com/o/oauth2/v2/auth",
		tokenURL:    "https://oauth2.googleapis.com/token",
		revokeURL:   "https://oauth2.googleapis.com/revoke",
		channelsURL: "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
	}
}

const youtubeScopes = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"

func (p *YouTubeProvider) Platform() Platform { return YouTube }
func (p *YouTubeProvider) Label() string      { return "YouTube" }

func (p *YouTubeProvider) AuthorizeURL(c Credentials, redirectURI, state, challenge string) string {
	q := url.Values{
		"client_id": {c.ID}, "redirect_uri": {redirectURI}, "response_type": {"code"},
		"scope": {youtubeScopes}, "state": {state},
		"code_challenge": {challenge}, "code_challenge_method": {"S256"},
		// Offline access with a forced consent screen is what makes Google hand
		// back a refresh token every time, not only the first.
		"access_type": {"offline"}, "prompt": {"consent"},
	}
	return p.authURL + "?" + q.Encode()
}

type googleToken struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
}

func (t googleToken) tokens() Tokens {
	out := Tokens{Access: t.AccessToken, Refresh: t.RefreshToken, Scopes: strings.Fields(t.Scope)}
	if t.ExpiresIn > 0 {
		at := time.Now().Add(time.Duration(t.ExpiresIn) * time.Second)
		out.ExpiresAt = &at
	}
	return out
}

func (p *YouTubeProvider) Exchange(ctx context.Context, c Credentials, redirectURI, code, verifier string) (Tokens, Account, error) {
	var tok googleToken
	err := p.postForm(ctx, p.tokenURL, url.Values{
		"grant_type": {"authorization_code"}, "code": {code}, "client_id": {c.ID}, "client_secret": {c.Secret},
		"redirect_uri": {redirectURI}, "code_verifier": {verifier},
	}, &tok)
	if err != nil {
		return Tokens{}, Account{}, err
	}
	if tok.AccessToken == "" {
		return Tokens{}, Account{}, &provider.Error{Provider: "youtube", Message: "no access token in the response"}
	}
	account, err := p.channel(ctx, tok.AccessToken)
	if err != nil {
		return Tokens{}, Account{}, err
	}
	return tok.tokens(), account, nil
}

func (p *YouTubeProvider) Refresh(ctx context.Context, c Credentials, t Tokens) (Tokens, error) {
	var tok googleToken
	err := p.postForm(ctx, p.tokenURL, url.Values{
		"grant_type": {"refresh_token"}, "refresh_token": {t.Refresh}, "client_id": {c.ID}, "client_secret": {c.Secret},
	}, &tok)
	if err != nil {
		return Tokens{}, err
	}
	out := tok.tokens()
	if len(out.Scopes) == 0 {
		out.Scopes = t.Scopes
	}
	return out, nil
}

func (p *YouTubeProvider) Revoke(ctx context.Context, t Tokens) error {
	token := t.Refresh
	if token == "" {
		token = t.Access
	}
	return p.postForm(ctx, p.revokeURL, url.Values{"token": {token}}, nil)
}

func (p *YouTubeProvider) channel(ctx context.Context, access string) (Account, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.channelsURL, nil)
	if err != nil {
		return Account{}, err
	}
	req.Header.Set("Authorization", "Bearer "+access)
	resp, err := p.http.Do(req)
	if err != nil {
		return Account{}, &provider.Error{Provider: "youtube", Message: "could not reach YouTube", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		return Account{}, provider.FromHTTPStatus("youtube", resp.StatusCode, "reading the channel")
	}
	var out struct {
		Items []struct {
			ID      string `json:"id"`
			Snippet struct {
				Title string `json:"title"`
			} `json:"snippet"`
		} `json:"items"`
	}
	if err := json.Unmarshal(body, &out); err != nil || len(out.Items) == 0 || out.Items[0].ID == "" {
		return Account{}, &provider.Error{Provider: "youtube", Message: "this Google account has no YouTube channel"}
	}
	return Account{ID: out.Items[0].ID, Name: out.Items[0].Snippet.Title}, nil
}

// postForm sends a form and decodes a JSON answer. A nil out ignores the body.
func (p *YouTubeProvider) postForm(ctx context.Context, endpoint string, form url.Values, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := p.http.Do(req)
	if err != nil {
		return &provider.Error{Provider: "youtube", Message: "could not reach Google", Transient: true, Err: err}
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		// 400 invalid_grant is how Google says a sign-in was revoked or a code reused.
		return provider.FromHTTPStatus("youtube", resp.StatusCode, fmt.Sprintf("token request refused (%d)", resp.StatusCode))
	}
	if out == nil {
		return nil
	}
	if err := json.Unmarshal(body, out); err != nil {
		return &provider.Error{Provider: "youtube", Message: "unreadable response from Google"}
	}
	return nil
}
