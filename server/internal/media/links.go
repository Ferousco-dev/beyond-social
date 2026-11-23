package media

import (
	"context"
	"errors"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/mediatime"
	"github.com/Ferousco-dev/beyond-social/server/internal/safenet"
)

// A provider fetches a file it is handed by link, so a phone clip goes to it
// without passing through this server. The link must outlive the time a job can
// wait in the queue before it is submitted.
const providerLinkTTL = 6 * time.Hour

// RangeReader reads part of a stored object. Storage implements it; without it
// a video's length cannot be measured and editing is refused.
type RangeReader interface {
	ReadRange(ctx context.Context, bucket, path string, offset, length int64) ([]byte, error)
}

// ErrCannotMeasure means a video's playing time could not be read from its headers.
var ErrCannotMeasure = errors.New("the video's length could not be read")

// VideoSource is a user's video ready to hand to a provider.
type VideoSource struct {
	URL     string
	Seconds float64
}

// editVideoTypes are the containers the editing model accepts.
var editVideoTypes = map[string]bool{"video/mp4": true, "video/quicktime": true}

// MeasureVideo checks that a video is the user's, finished uploading and an MP4
// or QuickTime file, and reads how long it plays from its own headers. The
// length is what an edit is priced by, so it is measured here, never taken from
// the browser.
func (s *Service) MeasureVideo(ctx context.Context, userID, id string) (Item, float64, error) {
	item, err := s.store.Get(ctx, userID, id)
	if err != nil {
		return Item{}, 0, err
	}
	if !item.Ready {
		return Item{}, 0, ErrNotUploaded
	}
	if item.Kind != KindVideo || !editVideoTypes[canonicalMIME(item.MIME)] {
		return Item{}, 0, ErrUnsupported
	}
	if item.Size > maxBytes[KindVideo] {
		return Item{}, 0, ErrTooLarge
	}
	rr, ok := s.storage.(RangeReader)
	if !ok {
		return Item{}, 0, ErrCannotMeasure
	}
	read := func(off, n int64) ([]byte, error) { return rr.ReadRange(ctx, Bucket, item.Path, off, n) }
	head, err := read(0, 16)
	if err != nil {
		return Item{}, 0, err
	}
	if _, err := safenet.SniffVideo(head); err != nil {
		return Item{}, 0, ErrUnsupported
	}
	seconds, ok := mediatime.MP4SecondsAt(read, item.Size)
	if !ok || seconds <= 0 {
		return Item{}, 0, ErrCannotMeasure
	}
	return item, seconds, nil
}

// VideoLink measures a user's video and returns a link a provider can fetch it from.
func (s *Service) VideoLink(ctx context.Context, userID, id string) (VideoSource, error) {
	item, seconds, err := s.MeasureVideo(ctx, userID, id)
	if err != nil {
		return VideoSource{}, err
	}
	link, err := s.storage.SignedURL(ctx, Bucket, item.Path, providerLinkTTL)
	if err != nil {
		return VideoSource{}, err
	}
	return VideoSource{URL: link, Seconds: seconds}, nil
}

// pictureTypes are the picture formats the editing model accepts. WebP is not one.
var pictureTypes = map[string]bool{"image/jpeg": true, "image/png": true}

// PictureLinks returns provider links for a user's JPEG or PNG pictures, in
// order, checking each one's own bytes and refusing anyone else's.
func (s *Service) PictureLinks(ctx context.Context, userID string, ids []string) ([]string, error) {
	rr, ok := s.storage.(RangeReader)
	if !ok {
		return nil, ErrUnsupported
	}
	links := make([]string, 0, len(ids))
	for _, id := range ids {
		item, err := s.store.Get(ctx, userID, id)
		if err != nil {
			return nil, err
		}
		if !item.Ready {
			return nil, ErrNotUploaded
		}
		if item.Kind != KindImage || !pictureTypes[canonicalMIME(item.MIME)] {
			return nil, ErrUnsupported
		}
		head, err := rr.ReadRange(ctx, Bucket, item.Path, 0, 512)
		if err != nil {
			return nil, err
		}
		if !bytesMatchKind(KindImage, head) {
			return nil, ErrUnsupported
		}
		link, err := s.storage.SignedURL(ctx, Bucket, item.Path, providerLinkTTL)
		if err != nil {
			return nil, err
		}
		links = append(links, link)
	}
	return links, nil
}
