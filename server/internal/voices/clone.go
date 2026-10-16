package voices

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/elevenlabs"
)

// Cloner creates provider voices from audio samples.
type Cloner interface {
	AddVoice(ctx context.Context, name string, samples []elevenlabs.Sample) (string, error)
}

// MediaLoader reads a user's uploaded audio back for cloning.
type MediaLoader interface {
	Load(ctx context.Context, userID, id string, max int64) ([]byte, string, error)
}

// CloneRecords remembers which provider voice belongs to which user.
type CloneRecords interface {
	SaveClone(ctx context.Context, userID, providerVoiceID, name string) error
}

// CloneService clones a user's uploaded voice sample into a reusable voice.
type CloneService struct {
	records CloneRecords
	media   MediaLoader
	voices  Cloner
}

func NewCloneService(records CloneRecords, media MediaLoader, voices Cloner) *CloneService {
	return &CloneService{records: records, media: media, voices: voices}
}

var ErrCloneFailed = errors.New("that sample could not become a voice")

// Clone loads one uploaded sample and registers the cloned voice. The caller
// proves consent before calling: cloning without it is a deepfake pipeline.
func (s *CloneService) Clone(ctx context.Context, userID, name, mediaID string) (Voice, error) {
	name = strings.TrimSpace(name)
	if name == "" || utf8.RuneCountInString(name) > 120 {
		return Voice{}, errors.New("voices: give the voice a name of 1 to 120 characters")
	}
	data, mime, err := s.media.Load(ctx, userID, mediaID, 10<<20)
	if err != nil {
		return Voice{}, errors.New("voices: that sample cannot be read; upload it again")
	}
	if !strings.HasPrefix(mime, "audio/") {
		return Voice{}, errors.New("voices: clone from an audio sample")
	}
	voiceID, err := s.voices.AddVoice(ctx, name, []elevenlabs.Sample{{FileName: "sample", MimeType: mime, Data: data}})
	if err != nil {
		return Voice{}, errors.Join(ErrCloneFailed, err)
	}
	if err := s.records.SaveClone(ctx, userID, voiceID, name); err != nil {
		return Voice{}, err
	}
	return Voice{ID: voiceID, Name: name, Scope: ScopeOwn}, nil
}
