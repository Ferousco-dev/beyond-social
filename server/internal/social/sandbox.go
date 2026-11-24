package social

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/url"
	"strings"

	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
)

// Sandbox stands in for a platform when its app keys are not set up yet, so
// connecting, posting and scheduling can be tried end to end on a developer's
// machine. Signing in comes straight back connected to a test account, and
// posting succeeds without sending anything anywhere. It is never used in
// production: the server refuses to switch it on there.
type Sandbox struct{ For Platform }

// FailWord in a caption makes a sandbox post fail as a platform would, so the
// failure path can be seen too.
const FailWord = "#sandboxfail"

func (s Sandbox) Platform() Platform { return s.For }

func (s Sandbox) Label() string {
	names := map[Platform]string{YouTube: "YouTube", TikTok: "TikTok", Instagram: "Instagram"}
	return names[s.For] + " (test)"
}

// Keyless says the sandbox signs in without app credentials.
func (Sandbox) Keyless() bool { return true }

// AuthorizeURL skips the platform: the browser goes straight back to our own
// callback with a code, as the platform would send it after the person agreed.
func (Sandbox) AuthorizeURL(_ Credentials, redirectURI, state, _ string) string {
	q := url.Values{"code": {"sandbox"}, "state": {state}}
	sep := "?"
	if strings.Contains(redirectURI, "?") {
		sep = "&"
	}
	return redirectURI + sep + q.Encode()
}

func (s Sandbox) Exchange(_ context.Context, _ Credentials, _, code, _ string) (Tokens, Account, error) {
	if code != "sandbox" {
		return Tokens{}, Account{}, &provider.Error{Provider: string(s.For), Message: "sandbox sign-in was refused"}
	}
	return Tokens{Access: "sandbox-" + string(s.For)}, Account{ID: "sandbox-" + string(s.For), Name: "Test " + s.Label()}, nil
}

func (Sandbox) Refresh(_ context.Context, _ Credentials, t Tokens) (Tokens, error) { return t, nil }

func (Sandbox) Revoke(context.Context, Tokens) error { return nil }

// Publish pretends to post: it checks there is a video and returns an id, or
// fails as a platform would when the caption asks it to.
func (s Sandbox) Publish(_ context.Context, _ Tokens, in PublishInput) (Published, error) {
	if len(in.Video) == 0 {
		return Published{}, &provider.Error{Provider: string(s.For), Message: "The video was empty."}
	}
	if strings.Contains(strings.ToLower(in.Caption), FailWord) {
		return Published{}, &provider.Error{Provider: string(s.For), Message: s.Label() + " refused the post (sandbox test failure)."}
	}
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return Published{ID: "sandbox-" + hex.EncodeToString(b)}, nil
}
