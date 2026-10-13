package social

import "strings"

// These let the local sandbox stand in for the three platforms. They only
// change where requests go; nothing in production calls them.

// Redirect points every YouTube address at a sandbox server.
func (p *YouTubeProvider) Redirect(base string) *YouTubeProvider {
	base = strings.TrimRight(base, "/") + "/social"
	p.authURL, p.tokenURL, p.revokeURL = base+"/google/auth", base+"/google/token", base+"/google/revoke"
	p.channelsURL, p.uploadURL = base+"/youtube/channels", base+"/youtube/upload"
	return p
}

// Redirect points every TikTok address at a sandbox server.
func (p *TikTokProvider) Redirect(base string) *TikTokProvider {
	base = strings.TrimRight(base, "/") + "/social/tiktok"
	p.authURL, p.tokenURL, p.revokeURL = base+"/auth", base+"/token", base+"/revoke"
	p.userURL, p.initURL, p.statusURL = base+"/user", base+"/init", base+"/status"
	return p
}

// Redirect points Instagram's sign-in and Graph addresses at a sandbox server.
func (p *InstagramProvider) Redirect(base string) *InstagramProvider {
	base = strings.TrimRight(base, "/") + "/social/instagram"
	p.graph, p.auth = base+"/graph", base+"/dialog"
	return p
}
