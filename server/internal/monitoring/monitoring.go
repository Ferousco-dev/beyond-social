package monitoring

import (
	"context"
	"time"
)

type JobCounts struct {
	Queued          int        `json:"queued"`
	Running         int        `json:"running"`
	Completed       int        `json:"completed"`
	Failed          int        `json:"failed"`
	Ready           int        `json:"ready"`
	OldestQueuedAt  *time.Time `json:"oldestQueuedAt,omitempty"`
	OldestRunningAt *time.Time `json:"oldestRunningAt,omitempty"`
}

type PostCounts struct {
	Preparing  int `json:"preparing"`
	Scheduled  int `json:"scheduled"`
	Publishing int `json:"publishing"`
	Published  int `json:"published"`
	Failed     int `json:"failed"`
	Cancelled  int `json:"cancelled"`
}

type StorageUsage struct {
	MediaObjects int   `json:"mediaObjects"`
	MediaBytes   int64 `json:"mediaBytes"`
}

type Failure struct {
	Source  string    `json:"source"`
	Name    string    `json:"name"`
	Message string    `json:"message"`
	At      time.Time `json:"at"`
}

type Snapshot struct {
	RecentFailureDays int          `json:"recentFailureDays"`
	Jobs              JobCounts    `json:"jobs"`
	Posts             PostCounts   `json:"posts"`
	Storage           StorageUsage `json:"storage"`
	RecentFailures    []Failure    `json:"recentFailures"`
}

type Reader interface {
	Snapshot(ctx context.Context) (Snapshot, error)
}
