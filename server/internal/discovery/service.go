package discovery

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

const (
	DefaultLimit     = 20
	MaxLimit         = 60
	maxQueryRunes    = 80
	minQueryRunes    = 2
	maxActivePerUser = 3

	EventUpdated = "discovery.updated"
)

// Params is a search request: a term (hashtags start with #) or one video URL.
type Params struct {
	Platform video.Platform
	Query    string
	URL      string
	Limit    int
}

// Biller charges for searches. Close settles a delivered search and refunds a
// failed one; it must be safe to repeat.
type Biller interface {
	Reserve(ctx context.Context, userID, discoveryID string) error
	Close(ctx context.Context, userID, discoveryID string, delivered bool) error
}

type Service struct {
	repo      Repository
	publisher realtime.Publisher
	biller    Biller
}

// WithBiller turns on charging. Without one searches are free.
func (s *Service) WithBiller(b Biller) *Service {
	s.biller = b
	return s
}

func NewService(repo Repository, publisher realtime.Publisher) *Service {
	return &Service{repo: repo, publisher: publisher}
}

// Create validates the request and queues it. It returns immediately; the
// actor run happens in the background and progress arrives as events.
func (s *Service) Create(ctx context.Context, userID string, p Params) (Discovery, error) {
	d, err := validate(userID, p)
	if err != nil {
		return Discovery{}, err
	}
	active, err := s.repo.CountActive(ctx, userID)
	if err != nil {
		return Discovery{}, err
	}
	if active >= maxActivePerUser {
		return Discovery{}, ErrTooManyBusy
	}
	created, err := s.repo.Create(ctx, d)
	if err != nil {
		return Discovery{}, err
	}
	if s.biller != nil {
		if err := s.biller.Reserve(ctx, userID, created.ID); err != nil {
			// Not charged, so close the search rather than leave it for a worker.
			if _, failErr := s.repo.Advance(ctx, created.ID, Update{Status: StatusFailed, Error: "not charged"}); failErr != nil {
				slog.Error("close unfunded discovery", "discovery_id", created.ID, "error", failErr)
			}
			return Discovery{}, err
		}
	}
	publish(s.publisher, created)
	return created, nil
}

func (s *Service) Get(ctx context.Context, userID, id string) (Discovery, error) {
	return s.repo.Get(ctx, userID, id)
}

// Videos returns one page of results; hasMore is learned from an extra row.
func (s *Service) Videos(ctx context.Context, userID, id string, limit, offset int) ([]video.Video, bool, error) {
	// Ownership is checked on the discovery itself so a foreign ID is a 404,
	// not an empty page.
	if _, err := s.repo.Get(ctx, userID, id); err != nil {
		return nil, false, err
	}
	rows, err := s.repo.ListVideos(ctx, userID, id, limit+1, offset)
	if err != nil {
		return nil, false, err
	}
	if len(rows) > limit {
		return rows[:limit], true, nil
	}
	return rows, false, nil
}

func (s *Service) Video(ctx context.Context, userID, videoID string) (video.Video, error) {
	return s.repo.GetVideo(ctx, userID, videoID)
}

func validate(userID string, p Params) (Discovery, error) {
	limit := p.Limit
	if limit == 0 {
		limit = DefaultLimit
	}
	if limit < 1 || limit > MaxLimit {
		return Discovery{}, fmt.Errorf("%w: limit must be between 1 and %d", ErrInvalid, MaxLimit)
	}
	d := Discovery{UserID: userID, RequestedLimit: limit, Status: StatusQueued}

	switch {
	case p.Query != "" && p.URL != "":
		return Discovery{}, fmt.Errorf("%w: send either query or url, not both", ErrInvalid)
	case p.URL != "":
		platform, normalized, err := video.ParsePageURL(p.URL)
		if err != nil {
			return Discovery{}, fmt.Errorf("%w: %v", ErrInvalid, err)
		}
		if p.Platform != "" && p.Platform != platform {
			return Discovery{}, fmt.Errorf("%w: url is not a %s link", ErrInvalid, p.Platform)
		}
		d.Platform, d.Kind, d.Query, d.RequestedLimit = platform, KindURL, normalized, 1
	case p.Query != "":
		if !p.Platform.Valid() {
			return Discovery{}, fmt.Errorf("%w: platform must be tiktok or instagram", ErrInvalid)
		}
		q := strings.TrimSpace(p.Query)
		if n := utf8.RuneCountInString(q); n < minQueryRunes || n > maxQueryRunes || strings.IndexFunc(q, unicode.IsControl) >= 0 {
			return Discovery{}, fmt.Errorf("%w: search term must be %d-%d characters", ErrInvalid, minQueryRunes, maxQueryRunes)
		}
		d.Platform, d.Kind, d.Query = p.Platform, KindSearch, q
	default:
		return Discovery{}, fmt.Errorf("%w: query or url is required", ErrInvalid)
	}
	return d, nil
}

func publish(p realtime.Publisher, d Discovery) {
	if p == nil {
		return
	}
	event, err := realtime.NewEvent(EventUpdated, d.ID, d)
	if err != nil {
		slog.Error("build discovery event", "discovery_id", d.ID, "error", err)
		return
	}
	p.Publish(d.UserID, event)
}
