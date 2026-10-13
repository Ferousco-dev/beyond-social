// Package library lists a user's finished videos.
package library

import (
	"context"
	"errors"
	"time"
)

var ErrNotFound = errors.New("library: video not found")

// Item is one finished video. The ID is the job that made it, which is also
// what a post refers to.
type Item struct {
	ID              string    `json:"id"`
	Type            string    `json:"type"`
	Prompt          string    `json:"prompt,omitempty"`
	VideoURL        string    `json:"video_url"`
	ThumbnailURL    string    `json:"thumbnail_url,omitempty"`
	DurationSeconds float64   `json:"duration_seconds,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type Store interface {
	List(ctx context.Context, userID string, limit, offset int) ([]Item, error)
	Hide(ctx context.Context, userID, id string) error
}
