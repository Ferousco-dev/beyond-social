package httpserver

import (
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/secrets"
)

// setupCheck is one line of the admin's go-live checklist.
type setupCheck struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Group    string `json:"group"`
	Done     bool   `json:"done"`
	Required bool   `json:"required"`
	Hint     string `json:"hint,omitempty"`
}

// credentialChecks maps each pasted credential to its place in the checklist.
var credentialChecks = []struct {
	name, label, group string
	required           bool
	hint               string
}{
	{secrets.NameGemini, "Gemini key", "Providers", true, "Chat, scripts and link analysis"},
	{secrets.NameOpenRouter, "OpenRouter key", "Providers", false, "Lets the assistant use models other than Gemini"},
	{secrets.NameApify, "Apify token", "Providers", true, "Discover and link lookup"},
	{secrets.NameKIE, "KIE key", "Providers", true, "Video generation"},
	{secrets.NameHeygen, "HeyGen key", "Providers", true, "Avatar videos"},
	{secrets.NameKIEWebhook, "KIE webhook secret", "Webhooks", false, "Signs completion callbacks"},
	{secrets.NameHeygenWebhook, "HeyGen webhook secret", "Webhooks", false, "Signs completion callbacks"},
	{secrets.NameYouTubeClientID, "YouTube client ID", "Publishing", false, "Google developer app"},
	{secrets.NameYouTubeClientSecret, "YouTube client secret", "Publishing", false, "Google developer app"},
	{secrets.NameTikTokClientKey, "TikTok client key", "Publishing", false, "TikTok developer app"},
	{secrets.NameTikTokClientSecret, "TikTok client secret", "Publishing", false, "TikTok developer app"},
	{secrets.NameMetaAppID, "Meta app ID", "Publishing", false, "Instagram, via a Meta app"},
	{secrets.NameMetaAppSecret, "Meta app secret", "Publishing", false, "Instagram, via a Meta app"},
}

// setup reports what is configured and what still needs doing, so an admin can
// get the service running from the console without touching the server.
func (a *App) setup(w http.ResponseWriter, r *http.Request) {
	statuses, err := a.deps.Vault.Statuses(r.Context())
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	present := make(map[string]bool, len(statuses))
	for _, s := range statuses {
		present[s.Name] = s.Source != "missing"
	}

	checks := []setupCheck{
		{ID: "encryption", Label: "Encryption key", Group: "Server", Done: a.deps.Vault.Writable(), Required: true,
			Hint: "Set APP_ENCRYPTION_KEY on the server once. Without it keys cannot be saved here."},
		{ID: "public_url", Label: "Public API address", Group: "Server", Done: a.deps.PublicBaseURL != "",
			Hint: "Set PUBLIC_BASE_URL so providers can call back. Without it jobs are polled instead."},
	}
	for _, c := range credentialChecks {
		checks = append(checks, setupCheck{ID: c.name, Label: c.label, Group: c.group, Done: present[c.name], Required: c.required, Hint: c.hint})
	}

	remaining := 0
	for _, c := range checks {
		if c.Required && !c.Done {
			remaining++
		}
	}
	writeData(w, http.StatusOK, map[string]any{"checks": checks, "ready": remaining == 0, "remaining": remaining})
}
