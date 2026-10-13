// Package chat holds conversations between a user and the assistant. A message
// either gets an answer or, when the user asks for something that can be made,
// is turned into a workflow plan the user then approves.
package chat

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/alerts"
	"github.com/Ferousco-dev/beyond-social/server/internal/gemini"
	"github.com/Ferousco-dev/beyond-social/server/internal/jobs"
	"github.com/Ferousco-dev/beyond-social/server/internal/media"
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
	"github.com/Ferousco-dev/beyond-social/server/internal/social"
)

const (
	MaxMessageRunes = 2000
	// historyTurns is how much of the thread the assistant reads for context.
	historyTurns = 10
	titleRunes   = 60
)

var (
	ErrNotFound   = errors.New("conversation not found")
	ErrInvalid    = errors.New("invalid message")
	ErrDailyLimit = errors.New("daily message limit reached")
	// ErrBusy means the user already has as many active workflows as allowed.
	ErrBusy = errors.New("too many active workflows")
)

type Role string

const (
	RoleUser      Role = "user"
	RoleAssistant Role = "assistant"
)

type Conversation struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Message struct {
	ID             string             `json:"id"`
	UserID         string             `json:"-"`
	ConversationID string             `json:"conversation_id"`
	Role           Role               `json:"role"`
	Content        string             `json:"content"`
	WorkflowID     string             `json:"workflow_id,omitempty"`
	ReplyTo        string             `json:"reply_to,omitempty"`
	JobID          string             `json:"job_id,omitempty"`
	Attachments    []media.Descriptor `json:"attachments,omitempty"`
	// Script is the structured script this message proposed, if it did.
	Script    *Script   `json:"script,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type Store interface {
	Create(ctx context.Context, userID string) (Conversation, error)
	List(ctx context.Context, userID string, limit, offset int) ([]Conversation, error)
	// Get returns ErrNotFound for a conversation the user does not own.
	Get(ctx context.Context, userID, id string) (Conversation, error)
	Archive(ctx context.Context, userID, id string) error
	Messages(ctx context.Context, userID, id string, limit int) ([]Message, error)
	// AddUser stores the user's message. With a key, a repeat returns the
	// original and isNew=false.
	AddUser(ctx context.Context, m Message, key string) (saved Message, isNew bool, err error)
	// ReplyTo returns the assistant message answering a user message, if any.
	ReplyTo(ctx context.Context, userMessageID string) (Message, bool, error)
	AddAssistant(ctx context.Context, m Message) (Message, error)
	// AddAssistantOnce stores a message that must exist at most once for a key,
	// such as the follow-up to a background job. A repeat returns isNew=false.
	AddAssistantOnce(ctx context.Context, m Message, key string) (saved Message, isNew bool, err error)
	SetTitle(ctx context.Context, id, title string) error
	// MissingFollowUps finds finished analyses whose result was never posted.
	MissingFollowUps(ctx context.Context, olderThan time.Duration, limit int) ([]jobs.Job, error)
	CountUserMessagesSince(ctx context.Context, userID string, since time.Time) (int, error)
}

// Turn is one earlier message, as the assistant sees it.
type Turn struct {
	Role    Role
	Content string
}

// Decision is what the router made of a message.
type Decision struct {
	// Post is set when the user also asked for the result to be posted.
	Post *PostIntent
	// Script is true when the idea should become a script first: a new idea, a
	// change to the script on screen, or a script the user wrote themselves.
	Script bool
	// Create is true when the user wants something made; the plan is then built
	// by the workflow planner rather than answered here.
	Create bool
	Reply  string
}

// RouteInput is one message and what the router needs to understand it.
type RouteInput struct {
	History []Turn
	Message string
	// Files are pictures and audio the model should look at or listen to.
	Files []gemini.Media
	// Now is the time where the user is, so "tomorrow at 6pm" means something.
	Now time.Time
}

type Router interface {
	Route(ctx context.Context, in RouteInput) (Decision, error)
}

// PostIntent is a request to post the finished video, found in the message.
type PostIntent struct {
	Platform social.Platform
	// At is nil when no time was given: post as soon as the video is ready.
	At      *time.Time
	Caption string
}

// Attachments resolves and reads what a message carries.
type Attachments interface {
	Resolve(ctx context.Context, userID string, ids []string) ([]media.Item, error)
	Load(ctx context.Context, userID, id string, max int64) ([]byte, string, error)
}

// Outcome is what planning a request produced, already in words for the user.
type Outcome struct {
	WorkflowID string
	Reply      string
}

type Planner interface {
	Plan(ctx context.Context, userID, request string, history []Turn, key string) (Outcome, error)
}

type Service struct {
	store   Store
	router  Router
	planner Planner
	events  realtime.Publisher
	alerts  alerts.Reporter
	// analyzer is optional: without it links are treated as ordinary text.
	analyzer Analyzer
	writer   ScriptWriter
	scripts  ScriptPlanner
	files    Attachments
	// DailyLimit returns the most messages a user may send per day; 0 or false means no limit.
	dailyLimit func(ctx context.Context) (int, bool, error)
	now        func() time.Time
}

func NewService(store Store, router Router, planner Planner) *Service {
	return &Service{store: store, router: router, planner: planner, now: time.Now}
}

func (s *Service) WithEvents(p realtime.Publisher) *Service {
	s.events = p
	return s
}

// WithAlerts reports failures only an operator can fix (no credit, bad key).
func (s *Service) WithAlerts(r alerts.Reporter) *Service {
	s.alerts = r
	return s
}

// ScriptPlanner turns an approved script into a workflow without a model.
type ScriptPlanner interface {
	PlanScript(ctx context.Context, userID string, script Script, post *PostIntent, key string) (Outcome, error)
}

// WithScriptPlanner makes "use this script" build the workflow from the script
// itself. Without it the planner works from the conversation text.
func (s *Service) WithScriptPlanner(p ScriptPlanner) *Service {
	s.scripts = p
	return s
}

// WithScriptWriter turns on the script step. Without it every idea goes
// straight to planning.
func (s *Service) WithScriptWriter(w ScriptWriter) *Service {
	s.writer = w
	return s
}

// WithAttachments turns on pictures, video and audio in messages.
func (s *Service) WithAttachments(a Attachments) *Service {
	s.files = a
	return s
}

func (s *Service) WithDailyLimit(fn func(ctx context.Context) (int, bool, error)) *Service {
	s.dailyLimit = fn
	return s
}

func (s *Service) Create(ctx context.Context, userID string) (Conversation, error) {
	return s.store.Create(ctx, userID)
}

func (s *Service) List(ctx context.Context, userID string, limit, offset int) ([]Conversation, error) {
	return s.store.List(ctx, userID, limit, offset)
}

func (s *Service) Archive(ctx context.Context, userID, id string) error {
	return s.store.Archive(ctx, userID, id)
}

// Thread returns a conversation and its messages, oldest first.
func (s *Service) Thread(ctx context.Context, userID, id string) (Conversation, []Message, error) {
	c, err := s.store.Get(ctx, userID, id)
	if err != nil {
		return Conversation{}, nil, err
	}
	msgs, err := s.store.Messages(ctx, userID, id, 200)
	return c, msgs, err
}

func cleanMessage(raw string, allowEmpty bool) (string, error) {
	text := strings.TrimSpace(raw)
	n := utf8.RuneCountInString(text)
	if n == 0 && allowEmpty {
		return "", nil
	}
	if n == 0 || n > MaxMessageRunes {
		return "", ErrInvalid
	}
	if strings.ContainsFunc(text, func(r rune) bool { return unicode.IsControl(r) && r != '\n' && r != '\t' }) {
		return "", ErrInvalid
	}
	return text, nil
}

func title(text string) string {
	line, _, _ := strings.Cut(text, "\n")
	runes := []rune(strings.TrimSpace(line))
	if len(runes) > titleRunes {
		return string(runes[:titleRunes]) + "..."
	}
	return string(runes)
}
