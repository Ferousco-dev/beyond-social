package social

import "context"

// PublishInput is one video to post. The file is already in memory: finished
// clips are short, and holding the bytes lets a platform upload in whatever
// shape it needs.
type PublishInput struct {
	Title      string
	Caption    string
	Visibility string // public, unlisted or private
	Video      []byte
	MIME       string
	// VideoURL is a short-lived link to the same file, for platforms that fetch
	// the video themselves instead of receiving it.
	VideoURL string
	// AccountID is the connected account, as the platform knows it.
	AccountID string
}

// Published is where the platform put it.
type Published struct {
	ID  string
	URL string
}

// Publisher posts a video to a platform. Errors are provider.Error values whose
// messages are safe to show: Transient means the platform could not be reached
// or asked to wait, and a definite rejection is not transient.
type Publisher interface {
	Publish(ctx context.Context, t Tokens, in PublishInput) (Published, error)
}
