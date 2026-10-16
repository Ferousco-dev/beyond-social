// Package assets owns asset groups: named bundles of face, voice, product
// and environment media plus extras, one per video concept (avatar001, ...).
// A group is picked per video, so nothing is re-uploaded for every generation.
package assets

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Ferousco-dev/beyond-social/server/internal/media"
)

// Slots with fixed meaning. Extras carry anything else.
const (
	SlotFace        = "face"
	SlotProduct     = "product"
	SlotVoice       = "voice"
	SlotEnvironment = "environment"
)

var (
	ErrInvalid        = errors.New("invalid asset group")
	ErrNotFound       = errors.New("asset group not found")
	ErrNameTaken      = errors.New("that group name is already used")
	ErrMediaNotUsable = errors.New("that file cannot fill this slot")
)

// Slots holds one media id per fixed slot; empty means unfilled.
type Slots struct {
	Face        string `json:"face"`
	Voice       string `json:"voice"`
	Product     string `json:"product"`
	Environment string `json:"environment"`
}

// Extra is one user-added file beyond the fixed slots.
type Extra struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

// Group is one named bundle.
type Group struct {
	ID           string     `json:"id"`
	UserID       string     `json:"-"`
	Name         string     `json:"name"`
	Slots        Slots      `json:"slots"`
	Extras       []Extra    `json:"extras"`
	FaceConsent  *time.Time `json:"face_consent_at"`
	VoiceConsent *time.Time `json:"voice_consent_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// SlotView is one filled slot with a short-lived link for display.
type SlotView struct {
	MediaID string `json:"media_id"`
	Name    string `json:"name"`
	URL     string `json:"url"`
}

// GroupDetail is a group with resolved links.
type GroupDetail struct {
	Group
	Face        *SlotView  `json:"face_view"`
	Voice       *SlotView  `json:"voice_view"`
	Product     *SlotView  `json:"product_view"`
	Environment *SlotView  `json:"environment_view"`
	ExtraViews  []SlotView `json:"extra_views"`
}

// MediaLookup resolves owned, usable files and links them for display.
// *media.Service satisfies it.
type MediaLookup interface {
	Resolve(ctx context.Context, userID string, ids []string) ([]media.Item, error)
	ViewURL(ctx context.Context, userID, id string) (string, error)
}

// Repository persists groups. *database.AssetStore satisfies it.
type Repository interface {
	List(ctx context.Context, userID string) ([]Group, error)
	Count(ctx context.Context, userID string) (int, error)
	Get(ctx context.Context, userID, id string) (Group, error)
	Create(ctx context.Context, userID, name string) (Group, error)
	Update(ctx context.Context, userID, id, name string, slots Slots, extras []Extra) (Group, error)
	Delete(ctx context.Context, userID, id string) error
	Consent(ctx context.Context, userID, id, kind string) (Group, error)
}

type Service struct {
	repo  Repository
	media MediaLookup
}

func NewService(repo Repository, media MediaLookup) *Service {
	return &Service{repo: repo, media: media}
}

func (s *Service) List(ctx context.Context, userID string) ([]Group, error) {
	return s.repo.List(ctx, userID)
}

// Create makes a group with an auto name (avatar001, ...) unless one is given.
func (s *Service) Create(ctx context.Context, userID, name string) (Group, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		count, err := s.repo.Count(ctx, userID)
		if err != nil {
			return Group{}, err
		}
		for i := count + 1; i < count+1000; i++ {
			candidate := fmt.Sprintf("avatar%03d", i)
			group, err := s.repo.Create(ctx, userID, candidate)
			if err == nil {
				return group, nil
			}
			if !errors.Is(err, ErrNameTaken) {
				return Group{}, err
			}
		}
		return Group{}, fmt.Errorf("%w: too many groups", ErrInvalid)
	}
	if utf8.RuneCountInString(name) > 40 || strings.IndexFunc(name, func(r rune) bool { return r < 0x20 }) >= 0 {
		return Group{}, fmt.Errorf("%w: names run 1 to 40 characters", ErrInvalid)
	}
	return s.repo.Create(ctx, userID, name)
}

// Set fills the fixed slots and extras from media the user owns. Every id is
// resolved first, so a foreign or unfinished file fails the whole update
// rather than half-landing in the group.
func (s *Service) Set(ctx context.Context, userID, id string, slots Slots, extras []Extra) (Group, error) {
	ids := []string{slots.Face, slots.Voice, slots.Product, slots.Environment}
	for _, extra := range extras {
		if strings.TrimSpace(extra.Label) == "" {
			return Group{}, fmt.Errorf("%w: every extra needs a label", ErrInvalid)
		}
		ids = append(ids, extra.ID)
	}
	byID, err := s.resolveOwned(ctx, userID, ids)
	if err != nil {
		return Group{}, err
	}
	check := func(kind, mediaID string, allowed ...string) error {
		if mediaID == "" {
			return nil
		}
		got, ok := byID[mediaID]
		if !ok {
			return fmt.Errorf("%w: %s", ErrMediaNotUsable, kind)
		}
		for _, want := range allowed {
			if got == want {
				return nil
			}
		}
		return fmt.Errorf("%w: %s needs %s", ErrMediaNotUsable, kind, strings.Join(allowed, " or "))
	}
	if err := check("face", slots.Face, "image", "video"); err != nil {
		return Group{}, err
	}
	if err := check("voice", slots.Voice, "audio"); err != nil {
		return Group{}, err
	}
	if err := check("product", slots.Product, "image", "video"); err != nil {
		return Group{}, err
	}
	if err := check("environment", slots.Environment, "image", "video"); err != nil {
		return Group{}, err
	}
	group, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return Group{}, err
	}
	return s.repo.Update(ctx, userID, group.ID, group.Name, slots, extras)
}

func (s *Service) resolveOwned(ctx context.Context, userID string, ids []string) (map[string]string, error) {
	unique := make([]string, 0, len(ids))
	seen := map[string]bool{}
	for _, id := range ids {
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		unique = append(unique, id)
	}
	if len(unique) == 0 {
		return map[string]string{}, nil
	}
	items, err := s.media.Resolve(ctx, userID, unique)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrMediaNotUsable, err)
	}
	byID := make(map[string]string, len(items))
	for _, item := range items {
		byID[item.ID] = string(item.Kind)
	}
	return byID, nil
}

// Detail resolves short-lived links for every filled slot.
func (s *Service) Detail(ctx context.Context, userID, id string) (GroupDetail, error) {
	group, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return GroupDetail{}, err
	}
	detail := GroupDetail{Group: group}
	view := func(mediaID string) *SlotView {
		if mediaID == "" {
			return nil
		}
		url, err := s.media.ViewURL(ctx, userID, mediaID)
		if err != nil {
			return nil
		}
		return &SlotView{MediaID: mediaID, URL: url}
	}
	detail.Face = view(group.Slots.Face)
	detail.Voice = view(group.Slots.Voice)
	detail.Product = view(group.Slots.Product)
	detail.Environment = view(group.Slots.Environment)
	for _, extra := range group.Extras {
		if v := view(extra.ID); v != nil {
			v.Name = extra.Label
			detail.ExtraViews = append(detail.ExtraViews, *v)
		}
	}
	return detail, nil
}

// Rename changes a group's name.
func (s *Service) Rename(ctx context.Context, userID, id, name string) (Group, error) {
	name = strings.TrimSpace(name)
	if name == "" || utf8.RuneCountInString(name) > 40 {
		return Group{}, fmt.Errorf("%w: names run 1 to 40 characters", ErrInvalid)
	}
	group, err := s.repo.Get(ctx, userID, id)
	if err != nil {
		return Group{}, err
	}
	return s.repo.Update(ctx, userID, group.ID, name, group.Slots, group.Extras)
}

// Consent records the owner's attestation for cloning a face or voice.
// Generation paths check these stamps before spending anything.
func (s *Service) Consent(ctx context.Context, userID, id, kind string) (Group, error) {
	if kind != "face" && kind != "voice" {
		return Group{}, fmt.Errorf("%w: consent covers face or voice", ErrInvalid)
	}
	return s.repo.Consent(ctx, userID, id, kind)
}

func (s *Service) Delete(ctx context.Context, userID, id string) error {
	return s.repo.Delete(ctx, userID, id)
}
