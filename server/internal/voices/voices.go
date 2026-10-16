// Package voices decides which voices a user may speak with and lists them.
//
// Cloned voices are recorded per user. The shared library comes from
// ElevenLabs; a voice recorded for someone else is refused whoever lists it.
package voices

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/elevenlabs"
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

// Provider is the part of the ElevenLabs client used here.
type Provider interface {
	LibraryVoices(ctx context.Context) ([]elevenlabs.LibraryVoice, error)
	VoiceExists(ctx context.Context, voiceID string) (bool, error)
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

// List returns the user's own voices first, then the shared ElevenLabs
// library. ElevenLabs exposes no language, gender, or paging filters, so the
// query fields are accepted and ignored rather than rejected.
func (s *Service) List(ctx context.Context, userID string, q Query) (Page, error) {
	var out []Voice
	if q.Token == "" {
		own, err := s.records.OwnVoices(ctx, userID)
		if err != nil {
			return Page{}, err
		}
		out = append(out, own...)
	}
	library, err := s.provider.LibraryVoices(ctx)
	if err != nil {
		return Page{}, err
	}
	for _, v := range library {
		out = append(out, Voice{ID: v.ID, Name: v.Name, Scope: ScopeLibrary})
	}
	return Page{Voices: out}, nil
}

// Allowed returns nil when userID may use voiceID: it is one of their own,
// or a shared library voice no other user owns. A voice recorded for someone
// else is refused whatever the library says.
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
	exists, err := s.provider.VoiceExists(ctx, voiceID)
	if err != nil {
		return err
	}
	if !exists {
		return ErrNotAllowed
	}
	return nil
}
