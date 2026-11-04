package social

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// InstagramProvider signs in through Facebook Login and posts Reels to the
// Instagram business account linked to one of the user's Pages. Instagram
// fetches the video itself from a link, so the file must be reachable.
type InstagramProvider struct {
	http  *http.Client
	graph string // https://graph.facebook.com/<version>
	auth  string
	// poll is how often a Reel is checked while Instagram processes it, and
	// limit is how long we wait. Tests shorten both.
	poll, limit time.Duration
}

const graphVersion = "v21.0"

func NewInstagram() *InstagramProvider {
	return &InstagramProvider{
		http:  &http.Client{Timeout: 30 * time.Second},
		graph: "https://graph.facebook.com/" + graphVersion,
		auth:  "https://www.facebook.com/" + graphVersion + "/dialog/oauth",
		poll:  5 * time.Second, limit: 4 * time.Minute,
	}
}

func (p *InstagramProvider) Platform() Platform { return Instagram }
func (p *InstagramProvider) Label() string      { return "Instagram" }

const instagramScopes = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement"

func (p *InstagramProvider) AuthorizeURL(c Credentials, redirectURI, state, _ string) string {
	// Facebook Login does not use PKCE; the single-use state protects the flow.
	q := url.Values{"client_id": {c.ID}, "redirect_uri": {redirectURI}, "state": {state}, "scope": {instagramScopes}, "response_type": {"code"}}
	return p.auth + "?" + q.Encode()
}

type metaToken struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

func (t metaToken) tokens() Tokens {
	out := Tokens{Access: t.AccessToken, Scopes: strings.Split(instagramScopes, ",")}
	if t.ExpiresIn > 0 {
		at := time.Now().Add(time.Duration(t.ExpiresIn) * time.Second)
		out.ExpiresAt = &at
	}
	return out
}

func (p *InstagramProvider) get(ctx context.Context, path string, q url.Values, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.graph+path+"?"+q.Encode(), nil)
	if err != nil {
		return err
	}
	return call(p.http, req, "instagram", out)
}

func (p *InstagramProvider) post(ctx context.Context, path string, form url.Values, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.graph+path, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return call(p.http, req, "instagram", out)
}

func (p *InstagramProvider) Exchange(ctx context.Context, c Credentials, redirectURI, code, _ string) (Tokens, Account, error) {
	var short metaToken
	if err := p.get(ctx, "/oauth/access_token", url.Values{
		"client_id": {c.ID}, "client_secret": {c.Secret}, "redirect_uri": {redirectURI}, "code": {code},
	}, &short); err != nil {
		return Tokens{}, Account{}, err
	}
	// The first token lasts an hour; exchanging it gives one that lasts about two months.
	long, err := p.extend(ctx, c, short.AccessToken)
	if err != nil {
		return Tokens{}, Account{}, err
	}
	account, err := p.account(ctx, long.AccessToken)
	if err != nil {
		return Tokens{}, Account{}, err
	}
	return long.tokens(), account, nil
}

func (p *InstagramProvider) extend(ctx context.Context, c Credentials, token string) (metaToken, error) {
	var long metaToken
	err := p.get(ctx, "/oauth/access_token", url.Values{
		"grant_type": {"fb_exchange_token"}, "client_id": {c.ID}, "client_secret": {c.Secret}, "fb_exchange_token": {token},
	}, &long)
	if err == nil && long.AccessToken == "" {
		err = &provider.Error{Provider: "instagram", Message: "no access token in the response"}
	}
	return long, err
}

// account finds the Instagram business account linked to one of the user's Pages.
func (p *InstagramProvider) account(ctx context.Context, token string) (Account, error) {
	var pages struct {
		Data []struct {
			IG *struct {
				ID       string `json:"id"`
				Username string `json:"username"`
			} `json:"instagram_business_account"`
		} `json:"data"`
	}
	if err := p.get(ctx, "/me/accounts", url.Values{"fields": {"instagram_business_account{id,username}"}, "access_token": {token}}, &pages); err != nil {
		return Account{}, err
	}
	for _, page := range pages.Data {
		if page.IG != nil && page.IG.ID != "" {
			return Account{ID: page.IG.ID, Name: page.IG.Username}, nil
		}
	}
	return Account{}, &provider.Error{Provider: "instagram",
		Message: "No Instagram business account is linked to your Facebook Pages. Link one in Instagram settings, then connect again."}
}

// Refresh renews a long-lived token. Meta has no refresh token: the current
// token is exchanged for a new one, and only while it is still valid.
func (p *InstagramProvider) Refresh(ctx context.Context, c Credentials, t Tokens) (Tokens, error) {
	long, err := p.extend(ctx, c, t.Access)
	if err != nil {
		return Tokens{}, err
	}
	return long.tokens(), nil
}

func (p *InstagramProvider) Revoke(ctx context.Context, t Tokens) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, p.graph+"/me/permissions?access_token="+url.QueryEscape(t.Access), nil)
	if err != nil {
		return err
	}
	return call(p.http, req, "instagram", nil)
}

// Publish creates a Reel from the video link, waits for Instagram to finish
// processing it, then publishes it.
func (p *InstagramProvider) Publish(ctx context.Context, t Tokens, in PublishInput) (Published, error) {
	if !strings.HasPrefix(in.VideoURL, "https://") || in.AccountID == "" {
		return Published{}, &provider.Error{Provider: "instagram", Message: "Instagram needs a reachable video link and a connected account."}
	}
	var container struct {
		ID string `json:"id"`
	}
	if err := p.post(ctx, "/"+url.PathEscape(in.AccountID)+"/media", url.Values{
		"media_type": {"REELS"}, "video_url": {in.VideoURL}, "caption": {clipTo(in.Caption, 2200)},
		"share_to_feed": {"true"}, "access_token": {t.Access},
	}, &container); err != nil {
		return Published{}, instagramRefusal(err)
	}
	if container.ID == "" {
		return Published{}, &provider.Error{Provider: "instagram", Message: "Instagram did not accept the video"}
	}
	if err := p.waitUntilReady(ctx, t.Access, container.ID); err != nil {
		return Published{}, err
	}
	var published struct {
		ID string `json:"id"`
	}
	if err := p.post(ctx, "/"+url.PathEscape(in.AccountID)+"/media_publish", url.Values{"creation_id": {container.ID}, "access_token": {t.Access}}, &published); err != nil {
		// The Reel may or may not have been published: never definite.
		var pe *provider.Error
		if asProvider(err, &pe) {
			pe.Transient = true
		}
		return Published{}, err
	}
	if published.ID == "" {
		return Published{}, &provider.Error{Provider: "instagram", Message: "Instagram published the Reel but did not say where", Transient: true}
	}
	result := Published{ID: published.ID, URL: "https://www.instagram.com/"}
	var link struct {
		Permalink string `json:"permalink"`
	}
	if p.get(ctx, "/"+url.PathEscape(published.ID), url.Values{"fields": {"permalink"}, "access_token": {t.Access}}, &link) == nil && strings.HasPrefix(link.Permalink, "https://") {
		result.URL = link.Permalink
	}
	return result, nil
}

func (p *InstagramProvider) waitUntilReady(ctx context.Context, token, container string) error {
	deadline := time.Now().Add(p.limit)
	for {
		var status struct {
			Code string `json:"status_code"`
		}
		if err := p.get(ctx, "/"+url.PathEscape(container), url.Values{"fields": {"status_code"}, "access_token": {token}}, &status); err != nil {
			return err
		}
		switch status.Code {
		case "FINISHED":
			return nil
		case "ERROR", "EXPIRED":
			return &provider.Error{Provider: "instagram", Status: 400, Message: "Instagram could not process this video. Reels must be vertical MP4 files between 3 and 90 seconds."}
		}
		if time.Now().After(deadline) {
			return &provider.Error{Provider: "instagram", Message: "Instagram took too long to process the video", Transient: true}
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(p.poll):
		}
	}
}

func instagramRefusal(err error) error {
	var pe *provider.Error
	if asProvider(err, &pe) && (pe.Status == http.StatusBadRequest || pe.Status == http.StatusForbidden) {
		return &provider.Error{Provider: "instagram", Status: pe.Status,
			Message: "Instagram refused the video. The account may not be allowed to post from this app yet, or the video is not a valid Reel."}
	}
	return err
}
