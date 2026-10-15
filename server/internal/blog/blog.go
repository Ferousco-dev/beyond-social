// Package blog publishes editorial posts. Published posts are public;
// drafts are visible only through the admin API.
package blog

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"
)

type Status string

const (
	StatusDraft     Status = "draft"
	StatusPublished Status = "published"
)

// Post is one article. Content is stored as Markdown.
type Post struct {
	ID             string
	Slug           string
	Title          string
	Excerpt        string
	Content        string
	FeaturedImage  string
	Category       string
	Tags           []string
	SEOTitle       string
	SEODescription string
	Status         Status
	PublishedAt    *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// Input carries admin-written fields for create and update.
type Input struct {
	Slug           string
	Title          string
	Excerpt        string
	Content        string
	FeaturedImage  string
	Category       string
	Tags           []string
	SEOTitle       string
	SEODescription string
	Status         Status
}

var (
	ErrInvalid   = errors.New("invalid post")
	ErrNotFound  = errors.New("post not found")
	ErrSlugTaken = errors.New("slug is already used")
)

const (
	maxTitleRunes   = 200
	maxExcerptRunes = 500
	maxCategoryLen  = 80
	maxTags         = 12
	maxTagRunes     = 40
)

// Repository persists posts. *database.BlogStore satisfies it.
type Repository interface {
	ListPublished(ctx context.Context, limit, offset int) ([]Post, error)
	GetPublished(ctx context.Context, slug string) (Post, error)
	Get(ctx context.Context, id string) (Post, error)
	ListAll(ctx context.Context, limit, offset int) ([]Post, error)
	Create(ctx context.Context, in Input) (Post, error)
	Update(ctx context.Context, id string, in Input) (Post, error)
	Delete(ctx context.Context, id string) error
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) ListPublished(ctx context.Context, limit, offset int) ([]Post, error) {
	return s.repo.ListPublished(ctx, limit, offset)
}

func (s *Service) GetPublished(ctx context.Context, slug string) (Post, error) {
	if !validSlug(slug) {
		return Post{}, ErrNotFound
	}
	return s.repo.GetPublished(ctx, slug)
}

func (s *Service) Get(ctx context.Context, id string) (Post, error) {
	return s.repo.Get(ctx, id)
}

func (s *Service) ListAll(ctx context.Context, limit, offset int) ([]Post, error) {
	return s.repo.ListAll(ctx, limit, offset)
}

// Create validates and publishes immediately when asked: setting status to
// published stamps published_at, so scheduling is explicit, not accidental.
func (s *Service) Create(ctx context.Context, in Input) (Post, error) {
	if err := clean(&in); err != nil {
		return Post{}, err
	}
	return s.repo.Create(ctx, in)
}

func (s *Service) Update(ctx context.Context, id string, in Input) (Post, error) {
	if err := clean(&in); err != nil {
		return Post{}, err
	}
	return s.repo.Update(ctx, id, in)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func clean(in *Input) error {
	in.Slug = strings.ToLower(strings.TrimSpace(in.Slug))
	in.Title = strings.TrimSpace(in.Title)
	in.Excerpt = strings.TrimSpace(in.Excerpt)
	in.Category = strings.TrimSpace(in.Category)
	if !validSlug(in.Slug) {
		return errors.Join(ErrInvalid, errors.New("slug must be lowercase letters, digits, and dashes"))
	}
	if in.Title == "" || utf8.RuneCountInString(in.Title) > maxTitleRunes {
		return errors.Join(ErrInvalid, errors.New("title must be 1-200 characters"))
	}
	if utf8.RuneCountInString(in.Excerpt) > maxExcerptRunes {
		return errors.Join(ErrInvalid, errors.New("excerpt must be at most 500 characters"))
	}
	if utf8.RuneCountInString(in.Category) > maxCategoryLen {
		return errors.Join(ErrInvalid, errors.New("category must be at most 80 characters"))
	}
	if len(in.Tags) > maxTags {
		return errors.Join(ErrInvalid, errors.New("at most 12 tags"))
	}
	seen := make(map[string]bool, len(in.Tags))
	tags := in.Tags[:0]
	for _, tag := range in.Tags {
		tag = strings.TrimSpace(tag)
		if tag == "" || utf8.RuneCountInString(tag) > maxTagRunes || seen[tag] {
			continue
		}
		seen[tag] = true
		tags = append(tags, tag)
	}
	in.Tags = tags
	if in.Tags == nil {
		in.Tags = []string{}
	}
	if in.Status != StatusDraft && in.Status != StatusPublished {
		in.Status = StatusDraft
	}
	return nil
}

func validSlug(slug string) bool {
	if slug == "" || len(slug) > 120 {
		return false
	}
	previousDash := true
	for _, r := range slug {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			previousDash = false
		case r == '-' && !previousDash:
			previousDash = true
		default:
			return false
		}
	}
	return !previousDash
}
