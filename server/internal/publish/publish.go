// Package publish posts finished videos to connected social accounts, now or at
// a chosen time. A post is only ever sent once: if the platform may have
// received it and the answer was lost, it is reported rather than retried.
package publish

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

type Status string

const (
	StatusPreparing  Status = "preparing"
	StatusScheduled  Status = "scheduled"
	StatusPublishing Status = "publishing"
	StatusPublished  Status = "published"
	StatusFailed     Status = "failed"
	StatusCancelled  Status = "cancelled"
)

func (s Status) Terminal() bool {
	return s == StatusPublished || s == StatusFailed || s == StatusCancelled
}

var (
	ErrInvalid  = errors.New("invalid post")
	ErrNotFound = errors.New("post not found")
	// ErrNotCancellable means the post is already on its way or finished.
	ErrNotCancellable = errors.New("this post can no longer be cancelled")
	// ErrNotReschedulable means the post already started or finished.
	ErrNotReschedulable = errors.New("this post can no longer be rescheduled")
)

const (
	maxCaption     = 2200
	maxTitle       = 100
	maxLeadTime    = 366 * 24 * time.Hour
	scheduleGrace  = time.Minute
	maxActivePosts = 50
)

type Post struct {
	ID               string          `json:"id"`
	UserID           string          `json:"-"`
	Platform         social.Platform `json:"platform"`
	Title            string          `json:"title,omitempty"`
	Caption          string          `json:"caption"`
	Visibility       string          `json:"visibility"`
	SourceURL        string          `json:"-"`
	JobID            string          `json:"job_id,omitempty"`
	StoragePath      string          `json:"-"`
	ScheduledAt      time.Time       `json:"scheduled_at"`
	Status           Status          `json:"status"`
	Attempts         int             `json:"-"`
	NextRunAt        *time.Time      `json:"-"`
	PublishStartedAt *time.Time      `json:"-"`
	ExternalID       string          `json:"external_id,omitempty"`
	ExternalURL      string          `json:"external_url,omitempty"`
	Error            string          `json:"error,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
}

// Update is a worker's change. Zero values leave a field alone.
type Update struct {
	Status      Status
	StoragePath *string
	NextRun     *time.Time
	// MarkStarted records that the platform is about to be called. It is only
	// ever set once for a post.
	MarkStarted   bool
	ExternalID    string
	ExternalURL   string
	Error         string
	AttemptsDelta int
}

type Store interface {
	// Create inserts the post. With a key, a repeat returns the original with isNew=false.
	Create(ctx context.Context, p Post, key string) (created Post, isNew bool, err error)
	Get(ctx context.Context, userID, id string) (Post, error)
	List(ctx context.Context, userID string, limit, offset int) ([]Post, error)
	CountOpen(ctx context.Context, userID string) (int, error)
	// Cancel moves a post that has not started publishing to cancelled.
	Cancel(ctx context.Context, userID, id string) (Post, error)
	// Reschedule moves a post that has not started publishing to a new time.
	Reschedule(ctx context.Context, userID, id string, at time.Time) (Post, error)
	// Claim leases due posts, pushing their next_run_at out by lease.
	Claim(ctx context.Context, limit int, lease time.Duration) ([]Post, error)
	Advance(ctx context.Context, id string, u Update) (Post, error)
}

// Request is what a user (or the assistant, with approval) asks for.
type Request struct {
	Platform   social.Platform
	Title      string
	Caption    string
	Visibility string
	// Exactly one of JobID and SourceURL says which video.
	JobID     string
	SourceURL string
	// At is when to post. Nil means as soon as the video is ready.
	At *time.Time
}

// JobReader finds a finished clip made earlier.
type JobReader interface {
	Get(ctx context.Context, userID, jobID string) (jobs.Job, error)
}

// Accounts says whether a sign-in can be used.
type Accounts interface {
	Usable(ctx context.Context, userID string, p social.Platform) error
}

type Service struct {
	store    Store
	jobs     JobReader
	accounts Accounts
	now      func() time.Time
}

func NewService(store Store, j JobReader, a Accounts) *Service {
	return &Service{store: store, jobs: j, accounts: a, now: time.Now}
}

// Schedule validates and queues a post. The account must be connected, the
// video must be one the user made, and the time must be sensible.
func (s *Service) Schedule(ctx context.Context, userID string, r Request, key string) (Post, bool, error) {
	if !r.Platform.Valid() {
		return Post{}, false, fmt.Errorf("%w: unknown platform", ErrInvalid)
	}
	caption := strings.TrimSpace(r.Caption)
	title := strings.TrimSpace(r.Title)
	if utf8.RuneCountInString(caption) > maxCaption || utf8.RuneCountInString(title) > maxTitle {
		return Post{}, false, fmt.Errorf("%w: the caption or title is too long", ErrInvalid)
	}
	switch r.Visibility {
	case "", "public", "unlisted", "private":
	default:
		return Post{}, false, fmt.Errorf("%w: unknown visibility", ErrInvalid)
	}
	at := s.now()
	if r.At != nil {
		at = *r.At
	}
	if at.Before(s.now().Add(-scheduleGrace)) || at.After(s.now().Add(maxLeadTime)) {
		return Post{}, false, fmt.Errorf("%w: choose a time from now to a year ahead", ErrInvalid)
	}
	source, jobID, err := s.source(ctx, userID, r)
	if err != nil {
		return Post{}, false, err
	}
	if err := s.accounts.Usable(ctx, userID, r.Platform); err != nil {
		return Post{}, false, err
	}
	open, err := s.store.CountOpen(ctx, userID)
	if err != nil {
		return Post{}, false, err
	}
	if open >= maxActivePosts {
		return Post{}, false, fmt.Errorf("%w: too many posts are waiting", ErrInvalid)
	}
	visibility := r.Visibility
	if visibility == "" {
		visibility = "public"
	}
	return s.store.Create(ctx, Post{
		UserID: userID, Platform: r.Platform, Title: title, Caption: caption, Visibility: visibility,
		SourceURL: source, JobID: jobID, ScheduledAt: at, Status: StatusPreparing,
	}, key)
}

// source resolves which video is meant. A job id must be the user's own finished clip.
func (s *Service) source(ctx context.Context, userID string, r Request) (videoURL, jobID string, err error) {
	switch {
	case r.JobID != "" && r.SourceURL == "":
		job, err := s.jobs.Get(ctx, userID, r.JobID)
		if err != nil {
			return "", "", fmt.Errorf("%w: that video was not found", ErrInvalid)
		}
		if job.Status != jobs.StatusCompleted {
			return "", "", fmt.Errorf("%w: that video is not finished yet", ErrInvalid)
		}
		link, _ := job.Result["video_url"].(string)
		if !isHTTPS(link) {
			return "", "", fmt.Errorf("%w: that job made no video", ErrInvalid)
		}
		return link, job.ID, nil
	case r.SourceURL != "" && r.JobID == "":
		if !isHTTPS(r.SourceURL) {
			return "", "", fmt.Errorf("%w: the video address must be https", ErrInvalid)
		}
		return r.SourceURL, "", nil
	}
	return "", "", fmt.Errorf("%w: say which video to post", ErrInvalid)
}

func isHTTPS(raw string) bool {
	u, err := url.Parse(raw)
	return err == nil && u.Scheme == "https" && u.Host != "" && u.User == nil
}

func (s *Service) List(ctx context.Context, userID string, limit, offset int) ([]Post, error) {
	return s.store.List(ctx, userID, limit, offset)
}

func (s *Service) Get(ctx context.Context, userID, id string) (Post, error) {
	return s.store.Get(ctx, userID, id)
}

// Cancel stops a post that has not started publishing.
func (s *Service) Cancel(ctx context.Context, userID, id string) (Post, error) {
	return s.store.Cancel(ctx, userID, id)
}

// Reschedule moves a post that has not started publishing to a new time.
func (s *Service) Reschedule(ctx context.Context, userID, id string, at time.Time) (Post, error) {
	if at.Before(s.now().Add(-scheduleGrace)) || at.After(s.now().Add(maxLeadTime)) {
		return Post{}, fmt.Errorf("%w: choose a time from now to a year ahead", ErrInvalid)
	}
	return s.store.Reschedule(ctx, userID, id, at)
}
