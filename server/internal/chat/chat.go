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
	"github.com/Ferousco-dev/beyond-social/server/internal/realtime"
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
	ID             string    `json:"id"`
	UserID         string    `json:"-"`
	ConversationID string    `json:"conversation_id"`
	Role           Role      `json:"role"`
	Content        string    `json:"content"`
	WorkflowID     string    `json:"workflow_id,omitempty"`
	ReplyTo        string    `json:"reply_to,omitempty"`
	JobID          string    `json:"job_id,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
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
	CountUserMessagesSince(ctx context.Context, userID string, since time.Time) (int, error)
}

// Turn is one earlier message, as the assistant sees it.
type Turn struct {
	Role    Role
	Content string
}

// Decision is what the router made of a message.
type Decision struct {
	// Create is true when the user wants something made; the plan is then built
	// by the workflow planner rather than answered here.
	Create bool
	Reply  string
}

type Router interface {
	Route(ctx context.Context, history []Turn, message string) (Decision, error)
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

func cleanMessage(raw string) (string, error) {
	text := strings.TrimSpace(raw)
	n := utf8.RuneCountInString(text)
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
