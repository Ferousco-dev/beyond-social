package jobs

import (
	"errors"
	"fmt"
	"time"
)

type Status string

const (
	StatusQueued    Status = "queued"
	StatusRunning   Status = "running"
	StatusCompleted Status = "completed"
	StatusFailed    Status = "failed"
	StatusReady     Status = "ready"
)

var (
	ErrNotFound          = errors.New("job not found")
	ErrInvalidTransition = errors.New("invalid job status transition")
	ErrInvalidInput      = errors.New("invalid job input")
)

type Job struct {
	ID          string         `json:"id"`
	UserID      string         `json:"user_id"`
	Type        string         `json:"type"`
	Status      Status         `json:"status"`
	Stage       string         `json:"stage,omitempty"`
	Progress    int            `json:"progress"`
	Input       map[string]any `json:"input"`
	Result      map[string]any `json:"result"`
	Error       string         `json:"error,omitempty"`
	RetryCount  int            `json:"retry_count"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	StartedAt   *time.Time     `json:"started_at,omitempty"`
	CompletedAt *time.Time     `json:"completed_at,omitempty"`

	// Internal bookkeeping, never serialised to clients.
	ProviderTaskID string     `json:"-"`
	IdempotencyKey string     `json:"-"`
	NextRunAt      *time.Time `json:"-"`
}

// Update is a system-side change applied by a worker. Zero values mean "leave
// unchanged"; the store validates the status transition against the row it locks.
type Update struct {
	Status         Status
	Stage          *string
	Progress       *int
	ProviderTaskID *string
	Result         map[string]any
	Error          string
	RetryDelta     int
	// NextRun reschedules a non-terminal job. Terminal jobs are never rescheduled.
	NextRun *time.Time
}

// transitions is the full lifecycle. Completed, failed and ready are terminal.
var transitions = map[Status][]Status{
	StatusQueued:  {StatusRunning, StatusFailed, StatusReady},
	StatusRunning: {StatusCompleted, StatusFailed, StatusReady},
}

func (s Status) Valid() bool {
	switch s {
	case StatusQueued, StatusRunning, StatusCompleted, StatusFailed, StatusReady:
		return true
	}
	return false
}

func (s Status) Terminal() bool { return s.Valid() && len(transitions[s]) == 0 }

func ValidateTransition(from, to Status) error {
	if !from.Valid() || !to.Valid() {
		return fmt.Errorf("%w: unknown status %q -> %q", ErrInvalidTransition, from, to)
	}
	for _, allowed := range transitions[from] {
		if allowed == to {
			return nil
		}
	}
	return fmt.Errorf("%w: %s -> %s", ErrInvalidTransition, from, to)
}

const maxTypeLength = 64

// NewJob builds a queued job owned by userID.
func NewJob(userID, jobType string, input map[string]any) (Job, error) {
	if userID == "" {
		return Job{}, fmt.Errorf("%w: user is required", ErrInvalidInput)
	}
	if jobType == "" || len(jobType) > maxTypeLength {
		return Job{}, fmt.Errorf("%w: type must be 1-%d characters", ErrInvalidInput, maxTypeLength)
	}
	if input == nil {
		input = map[string]any{}
	}
	return Job{UserID: userID, Type: jobType, Status: StatusQueued, Input: input, Result: map[string]any{}}, nil
}
