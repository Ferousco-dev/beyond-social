// Package discovery finds videos on TikTok and Instagram through Apify and
// keeps each user's search history and results.
package discovery

import (
	"context"
	"errors"
	"time"

	"github.com/Ferousco-dev/beyond-social/server/internal/video"
)

type Status string

const (
	StatusQueued    Status = "queued"
	StatusRunning   Status = "running"
	StatusCompleted Status = "completed"
	StatusFailed    Status = "failed"
)

func (s Status) Terminal() bool { return s == StatusCompleted || s == StatusFailed }

type Kind string

const (
	KindSearch Kind = "search"
	KindURL    Kind = "url"
)

var (
	ErrNotFound    = errors.New("discovery not found")
	ErrInvalid     = errors.New("invalid discovery request")
	ErrTooManyBusy = errors.New("too many discoveries in progress")
	ErrFinished    = errors.New("discovery already finished")
)

type Discovery struct {
	ID             string         `json:"id"`
	UserID         string         `json:"user_id"`
	Platform       video.Platform `json:"platform"`
	Kind           Kind           `json:"kind"`
	Query          string         `json:"query"`
	RequestedLimit int            `json:"requested_limit"`
	Status         Status         `json:"status"`
	ResultCount    int            `json:"result_count"`
	Error          string         `json:"error,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	CompletedAt    *time.Time     `json:"completed_at,omitempty"`

	ApifyRunID string `json:"-"`
	RetryCount int    `json:"-"`
}

// Update is a worker-side change. Zero values leave the field unchanged.
type Update struct {
	Status     Status
	RunID      *string
	Error      string
	RetryDelta int
	NextRun    *time.Time
}

type Repository interface {
	Create(ctx context.Context, d Discovery) (Discovery, error)
	Get(ctx context.Context, userID, id string) (Discovery, error)
	ListVideos(ctx context.Context, userID, discoveryID string, limit, offset int) ([]video.Video, error)
	GetVideo(ctx context.Context, userID, videoID string) (video.Video, error)
	CountActive(ctx context.Context, userID string) (int, error)

	Claim(ctx context.Context, limit int, lease time.Duration) ([]Discovery, error)
	Advance(ctx context.Context, id string, u Update) (Discovery, error)
	// Complete stores the videos and marks the discovery completed in one
	// transaction, so a finished discovery never has a partial result set.
	Complete(ctx context.Context, id string, videos []video.Video) (Discovery, error)
}
