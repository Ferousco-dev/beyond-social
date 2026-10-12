package transform

import (
	"context"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/apify"
	"github.com/Ferousco-dev/beyond-social/server/internal/provider"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

var ErrNoVideoFile = video.ErrNoVideoFile

const (
	resolveDeadline = 150 * time.Second
	// Apify refuses a cost cap below $0.50. One post costs a fraction of a cent,
	// so this is a ceiling, not a price.
	resolveChargeUSD = 0.50
)

// Resolver turns a video's public page URL into a fresh, fetchable file URL.
type Resolver interface {
	Resolve(ctx context.Context, p video.Platform, pageURL string) (string, error)
}

// ApifyResolver re-scrapes the single post at transform time. CDN links saved at
// discovery time are signed and expire, and downloading every result up front
// would be a paid add-on on every search, so one fresh scrape for the one video
// the user actually chose is cheaper and more reliable.
type ApifyResolver struct {
	API    apify.API
	Actors apify.Actors
}

func (r ApifyResolver) Resolve(ctx context.Context, p video.Platform, pageURL string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, resolveDeadline)
	defer cancel()

	run, err := r.API.StartRun(ctx, r.Actors.For(p),
		apify.BuildInput(apify.Criteria{Platform: p, URL: pageURL, Limit: 1, WithVideo: true}),
		apify.RunOptions{MaxItems: 1, MaxChargeUSD: resolveChargeUSD, TimeoutSeconds: int(resolveDeadline.Seconds())})
	if err != nil {
		return "", err
	}
	for !run.Finished() {
		if run, err = r.API.GetRun(ctx, run.ID, 20); err != nil {
			return "", err
		}
	}
	if run.Status != apify.StatusSucceeded {
		return "", &provider.Error{Provider: "apify", Message: "resolve run ended " + run.Status, Transient: true}
	}
	rows, err := r.API.Items(ctx, run.DefaultDatasetID, 1)
	if err != nil {
		return "", err
	}
	for _, row := range rows {
		if u := apify.PickVideoURL(p, row); u != "" {
			return u, nil
		}
	}
	return "", ErrNoVideoFile
}
