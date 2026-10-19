package analysis

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
)

// JobType is the type under which analyses are stored and claimed.
const JobType = "video_analysis"

// FetchJobType is the type of the job that downloads a linked video so the
// person can watch it before deciding to analyse it. It carries no price.
const FetchJobType = "video_fetch"

const (
	maxActivePerUser = 2
	// MaxNotesRunes bounds what a person can add to the instructions.
	MaxNotesRunes = 1000
)

var (
	ErrTooManyBusy  = errors.New("too many analyses in progress")
	ErrBadLink      = errors.New("not a supported video link")
	ErrNotesTooLong = errors.New("notes are too long")
)

// Jobs is the part of the job service analyses use.
type Jobs interface {
	Create(ctx context.Context, userID, jobType string, input map[string]any, idempotencyKey string) (jobs.Job, bool, error)
	CountActive(ctx context.Context, userID, jobType string) (int, error)
}

// LinkResolver turns a share-sheet link into the post's own address.
type LinkResolver interface {
	Resolve(ctx context.Context, raw string) (string, error)
}

type Service struct {
	jobs  Jobs
	links LinkResolver
}

func NewService(j Jobs) *Service { return &Service{jobs: j} }

// WithLinks lets shortened links (vm.tiktok.com and the like) be used.
func (s *Service) WithLinks(r LinkResolver) *Service {
	s.links = r
	return s
}

// Request is one analysis to queue: a link or a stored file, plus anything the
// person wants the analysis to pay attention to.
type Request struct {
	Link           Link
	MediaID        string
	Notes          string
	ConversationID string
}

// Start queues an analysis of one linked video. conversationID, when set, is
// where the finished description is posted. Credits are held by the job service
// before anything runs, so a short balance fails here and nothing is queued.
func (s *Service) Start(ctx context.Context, userID string, link Link, conversationID, key string) (jobs.Job, bool, error) {
	return s.Queue(ctx, userID, Request{Link: link, ConversationID: conversationID}, key)
}

// StartMedia queues an analysis of a video the user uploaded. The file is
// looked up by id when the job runs, so only its owner's job can read it.
func (s *Service) StartMedia(ctx context.Context, userID, mediaID, conversationID, key string) (jobs.Job, bool, error) {
	return s.Queue(ctx, userID, Request{MediaID: mediaID, ConversationID: conversationID}, key)
}

// Queue starts the analysis a Request describes.
func (s *Service) Queue(ctx context.Context, userID string, req Request, key string) (jobs.Job, bool, error) {
	notes := strings.TrimSpace(req.Notes)
	if utf8.RuneCountInString(notes) > MaxNotesRunes {
		return jobs.Job{}, false, ErrNotesTooLong
	}
	input := map[string]any{}
	if req.MediaID != "" {
		input["media_id"], input["kind"] = req.MediaID, "upload"
	} else {
		input["url"], input["kind"] = req.Link.URL, string(req.Link.Kind)
	}
	if notes != "" {
		input["notes"] = notes
	}
	if req.ConversationID != "" {
		input["conversation_id"] = req.ConversationID
	}
	return s.create(ctx, userID, JobType, input, key)
}

// StartFetch queues the download of a linked video for preview. A shortened
// link is followed first so the job and the person both see the real address.
func (s *Service) StartFetch(ctx context.Context, userID, raw, key string) (jobs.Job, bool, error) {
	if s.links != nil {
		if resolved, err := s.links.Resolve(ctx, raw); err == nil {
			raw = resolved
		}
	}
	link, ok := ParseLink(raw)
	if !ok {
		return jobs.Job{}, false, ErrBadLink
	}
	return s.create(ctx, userID, FetchJobType, map[string]any{"url": link.URL, "kind": string(link.Kind)}, key)
}

func (s *Service) create(ctx context.Context, userID, jobType string, input map[string]any, key string) (jobs.Job, bool, error) {
	active, err := s.jobs.CountActive(ctx, userID, jobType)
	if err != nil {
		return jobs.Job{}, false, err
	}
	if active >= maxActivePerUser {
		return jobs.Job{}, false, ErrTooManyBusy
	}
	job, isNew, err := s.jobs.Create(ctx, userID, jobType, input, key)
	if err != nil {
		return jobs.Job{}, false, fmt.Errorf("analysis: start: %w", err)
	}
	return job, isNew, nil
}
