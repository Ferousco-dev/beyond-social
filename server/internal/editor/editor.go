// Package editor stores timeline projects. The server keeps the document as
// opaque, size-bounded JSON: what a valid timeline looks like is the editor's
// concern, and it checks that when a project is opened.
package editor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	MaxDocumentBytes = 512 << 10
	MaxTitleRunes    = 120
	MaxProjects      = 200
)

var (
	ErrNotFound = errors.New("editor: project not found")
	// ErrStale means the save was based on an older version than the stored one.
	ErrStale   = errors.New("editor: project was changed elsewhere")
	ErrInvalid = errors.New("editor: invalid project")
	ErrLimit   = errors.New("editor: too many projects")
)

type Project struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	// ConversationID is the chat this project belongs to, if it was opened from one.
	ConversationID string          `json:"conversation_id,omitempty"`
	Document       json.RawMessage `json:"document"`
	Version        int             `json:"version"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

// Summary is a project without its document, for lists.
type Summary struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Store interface {
	Create(ctx context.Context, userID, title string, document json.RawMessage) (Project, error)
	Get(ctx context.Context, userID, id string) (Project, error)
	// ForConversation returns the chat's project, creating it on first use.
	ForConversation(ctx context.Context, userID, conversationID string) (Project, error)
	List(ctx context.Context, userID string, limit int) ([]Summary, error)
	// Save writes only when the stored version equals expected, then bumps it.
	Save(ctx context.Context, userID, id, title string, document json.RawMessage, expected int) (Project, error)
	Delete(ctx context.Context, userID, id string) error
	// ChatContext returns the recent messages of the chat a project belongs to, as plain text.
	ChatContext(ctx context.Context, userID, projectID string) (string, error)
}

// ValidateTitle trims a title and checks its length.
func ValidateTitle(title string) (string, error) {
	title = strings.TrimSpace(title)
	if title == "" || utf8.RuneCountInString(title) > MaxTitleRunes {
		return "", fmt.Errorf("%w: the title must be 1 to %d characters", ErrInvalid, MaxTitleRunes)
	}
	return title, nil
}

// ValidateDocument accepts a JSON object within the size limit.
func ValidateDocument(document json.RawMessage) error {
	if len(document) > MaxDocumentBytes {
		return fmt.Errorf("%w: the project is too large", ErrInvalid)
	}
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(document, &obj); err != nil || obj == nil {
		return fmt.Errorf("%w: the project must be a JSON object", ErrInvalid)
	}
	return nil
}
