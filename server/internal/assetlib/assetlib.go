// Package assetlib owns standalone assets: one file each, filed as a face,
// voice, product, environment, music or other, under a label the person chooses.
// Nothing is bundled, so any face can be paired with any voice per video.
package assetlib

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/media"
)

type Kind string

const (
	KindFace        Kind = "face"
	KindVoice       Kind = "voice"
	KindProduct     Kind = "product"
	KindEnvironment Kind = "environment"
	KindMusic       Kind = "music"
	KindOther       Kind = "other"
)

const maxLabel = 60

var (
	ErrInvalid        = errors.New("invalid asset")
	ErrNotFound       = errors.New("asset not found")
	ErrLabelTaken     = errors.New("that label is already used for this kind of asset")
	ErrMediaNotUsable = errors.New("that file cannot be used as this kind of asset")
)

// Accepts reports the file kinds an asset kind can hold. Faces are images so
// they can be animated; voices are recordings.
func (k Kind) Accepts() []media.Kind {
	switch k {
	case KindFace:
		return []media.Kind{media.KindImage}
	case KindVoice, KindMusic:
		return []media.Kind{media.KindAudio}
	case KindProduct, KindEnvironment:
		return []media.Kind{media.KindImage, media.KindVideo}
	case KindOther:
		return []media.Kind{media.KindImage, media.KindVideo, media.KindAudio}
	}
	return nil
}

// lipSyncFormats are the only files the lip-sync model reads: faces as JPEG
// or PNG, voices as MP3, WAV, M4A or OGG. Anything else would start a
// paid video that cannot sync, so it is refused when it is saved.
var lipSyncFormats = map[Kind]map[string]bool{
	KindFace:  {"image/jpeg": true, "image/png": true},
	KindVoice: {"audio/mpeg": true, "audio/wav": true, "audio/mp4": true, "audio/ogg": true},
}

// NeedsConsent is true for kinds that capture a real person.
func (k Kind) NeedsConsent() bool { return k == KindFace || k == KindVoice }

type Asset struct {
	ID        string     `json:"id"`
	UserID    string     `json:"-"`
	Kind      Kind       `json:"kind"`
	Label     string     `json:"label"`
	MediaID   string     `json:"media_id"`
	ConsentAt *time.Time `json:"consent_at"`
	CreatedAt time.Time  `json:"created_at"`
	// FileKind is the stored file's sort (image, video, audio).
	FileKind string `json:"file_kind"`
	// URL is a short-lived link for display, set when listing.
	URL string `json:"url"`
}

// MediaLookup resolves owned, usable files. *media.Service satisfies it.
type MediaLookup interface {
	Resolve(ctx context.Context, userID string, ids []string) ([]media.Item, error)
	ViewURL(ctx context.Context, userID, id string) (string, error)
}

// Repository persists assets. *database.AssetLibraryStore satisfies it.
type Repository interface {
	List(ctx context.Context, userID string) ([]Asset, error)
	Get(ctx context.Context, userID, id string) (Asset, error)
	Create(ctx context.Context, asset Asset) (Asset, error)
	Relabel(ctx context.Context, userID, id, label string) (Asset, error)
	Consent(ctx context.Context, userID, id string) (Asset, error)
	Delete(ctx context.Context, userID, id string) error
}

type Service struct {
	repo  Repository
	media MediaLookup
}

func NewService(repo Repository, media MediaLookup) *Service {
	return &Service{repo: repo, media: media}
}

// List returns every asset with a display link. A file that can no longer be
// linked is still listed, so it can be relabelled or removed.
func (s *Service) List(ctx context.Context, userID string) ([]Asset, error) {
	list, err := s.repo.List(ctx, userID)
	if err != nil {
		return nil, err
	}
	for i := range list {
		if url, err := s.media.ViewURL(ctx, userID, list[i].MediaID); err == nil {
			list[i].URL = url
		}
	}
	return list, nil
}

// Get returns one asset the person owns.
func (s *Service) Get(ctx context.Context, userID, id string) (Asset, error) {
	return s.repo.Get(ctx, userID, id)
}

// Create files an uploaded media item under a kind and label. The file must
// be the person's own, finished, and the right sort for the kind.
func (s *Service) Create(ctx context.Context, userID string, kind Kind, label, mediaID string) (Asset, error) {
	accepts := kind.Accepts()
	if accepts == nil {
		return Asset{}, fmt.Errorf("%w: unknown kind", ErrInvalid)
	}
	label, err := cleanLabel(label)
	if err != nil {
		return Asset{}, err
	}
	items, err := s.media.Resolve(ctx, userID, []string{mediaID})
	if err != nil || len(items) != 1 {
		return Asset{}, ErrMediaNotUsable
	}
	if !slices.Contains(accepts, items[0].Kind) {
		return Asset{}, fmt.Errorf("%w: a %s needs %s", ErrMediaNotUsable, kind, describe(accepts))
	}
	if formats, ok := lipSyncFormats[kind]; ok && !formats[baseMIME(items[0].MIME)] {
		return Asset{}, fmt.Errorf("%w: a %s must be %s", ErrMediaNotUsable, kind, map[Kind]string{KindFace: "a JPG or PNG photo", KindVoice: "an MP3, WAV, M4A or OGG recording"}[kind])
	}
	return s.repo.Create(ctx, Asset{UserID: userID, Kind: kind, Label: label, MediaID: mediaID})
}

func (s *Service) Relabel(ctx context.Context, userID, id, label string) (Asset, error) {
	label, err := cleanLabel(label)
	if err != nil {
		return Asset{}, err
	}
	return s.repo.Relabel(ctx, userID, id, label)
}

// Consent records that the person in a face or voice agreed to its use.
func (s *Service) Consent(ctx context.Context, userID, id string) (Asset, error) {
	asset, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return Asset{}, err
	}
	if !asset.Kind.NeedsConsent() {
		return Asset{}, fmt.Errorf("%w: only faces and voices take consent", ErrInvalid)
	}
	return s.repo.Consent(ctx, userID, id)
}

func (s *Service) Delete(ctx context.Context, userID, id string) error {
	return s.repo.Delete(ctx, userID, id)
}

// Usable returns an asset of the wanted kind that may be put in a video:
// the person's own, and consented when it shows or sounds like a person.
func (s *Service) Usable(ctx context.Context, userID, id string, kind Kind) (Asset, error) {
	asset, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return Asset{}, err
	}
	if asset.Kind != kind {
		return Asset{}, fmt.Errorf("%w: that asset is not a %s", ErrInvalid, kind)
	}
	if kind.NeedsConsent() && asset.ConsentAt == nil {
		return Asset{}, fmt.Errorf("%w: confirm consent for %q first", ErrInvalid, asset.Label)
	}
	return asset, nil
}

func cleanLabel(label string) (string, error) {
	label = strings.Join(strings.Fields(label), " ")
	if label == "" || utf8.RuneCountInString(label) > maxLabel {
		return "", fmt.Errorf("%w: labels run 1 to %d characters", ErrInvalid, maxLabel)
	}
	return label, nil
}

func baseMIME(value string) string {
	base, _, _ := strings.Cut(value, ";")
	return strings.ToLower(strings.TrimSpace(base))
}

func describe(kinds []media.Kind) string {
	names := make([]string, len(kinds))
	for i, kind := range kinds {
		names[i] = "an " + string(kind)
		if kind == media.KindVideo {
			names[i] = "a video"
		}
	}
	return strings.Join(names, " or ")
}
