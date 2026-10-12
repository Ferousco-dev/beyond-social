// Package voices decides which voices a user may speak with and lists them.
//
// HeyGen keeps every cloned voice in one workspace, so HeyGen itself cannot say
// whose voice is whose. Ownership is therefore decided here, from our own
// records of which voices we created for which user.
package voices

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/heygen"
)

var ErrNotAllowed = errors.New("voice is not available to this user")

type Scope string

const (
	ScopeOwn     Scope = "own"
	ScopeLibrary Scope = "library"
)

type Voice struct {
	ID              string `json:"voice_id"`
	Name            string `json:"name"`
	Scope           Scope  `json:"scope"`
	Language        string `json:"language,omitempty"`
	Gender          string `json:"gender,omitempty"`
	PreviewAudioURL string `json:"preview_audio_url,omitempty"`
}

// Records is what we know about who owns which cloned voice.
type Records interface {
	// OwnVoices lists the usable voices recorded for this user.
	OwnVoices(ctx context.Context, userID string) ([]Voice, error)
	// Ownership reports whether the voice is recorded for userID, and whether
	// it is recorded for anyone else.
	Ownership(ctx context.Context, userID, voiceID string) (own, other bool, err error)
}

// Provider is the part of the HeyGen client used here.
type Provider interface {
	ListVoices(ctx context.Context, q heygen.VoiceQuery) (heygen.VoicePage, error)
	GetVoice(ctx context.Context, voiceID string) (heygen.Voice, bool, error)
}

type Service struct {
	records  Records
	provider Provider
}

func NewService(r Records, p Provider) *Service { return &Service{records: r, provider: p} }

type Query struct {
	Language string
	Gender   string
	Limit    int
	Token    string
}

type Page struct {
	Voices    []Voice
	HasMore   bool
	NextToken string
}

// List returns the user's own voices first (on the first page only), then the
// shared HeyGen library.
func (s *Service) List(ctx context.Context, userID string, q Query) (Page, error) {
	var out []Voice
	if q.Token == "" {
		own, err := s.records.OwnVoices(ctx, userID)
		if err != nil {
			return Page{}, err
		}
		out = append(out, own...)
	}
	page, err := s.provider.ListVoices(ctx, heygen.VoiceQuery{Type: "public", Language: q.Language, Gender: q.Gender, Limit: q.Limit, Token: q.Token})
	if err != nil {
		return Page{}, err
	}
	for _, v := range page.Voices {
		out = append(out, Voice{ID: v.ID, Name: v.Name, Scope: ScopeLibrary, Language: v.Language, Gender: v.Gender, PreviewAudioURL: v.PreviewAudioURL})
	}
	return Page{Voices: out, HasMore: page.HasMore, NextToken: page.NextToken}, nil
}

// Allowed returns nil when userID may use voiceID: it is one of their own, or
// a voice HeyGen offers that no other user owns. A voice recorded for someone
// else is refused whatever HeyGen says about it.
func (s *Service) Allowed(ctx context.Context, userID, voiceID string) error {
	if voiceID == "" {
		return ErrNotAllowed
	}
	own, other, err := s.records.Ownership(ctx, userID, voiceID)
	if err != nil {
		return err
	}
	if own {
		return nil
	}
	if other {
		return ErrNotAllowed
	}
	_, exists, err := s.provider.GetVoice(ctx, voiceID)
	if err != nil {
		return err
	}
	if !exists {
		return ErrNotAllowed
	}
	return nil
}
