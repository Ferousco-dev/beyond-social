package blog

import (
	"context"
	"errors"
	"testing"
)

type fakeRepo struct {
	posts map[string]Post
}

func newFakeRepo() *fakeRepo { return &fakeRepo{posts: make(map[string]Post)} }

func (f *fakeRepo) ListPublished(_ context.Context, _, _ int) ([]Post, error) {
	return nil, nil
}

func (f *fakeRepo) GetPublished(_ context.Context, slug string) (Post, error) {
	for _, post := range f.posts {
		if post.Slug == slug && post.Status == StatusPublished {
			return post, nil
		}
	}
	return Post{}, ErrNotFound
}

func (f *fakeRepo) Get(_ context.Context, id string) (Post, error) {
	post, ok := f.posts[id]
	if !ok {
		return Post{}, ErrNotFound
	}
	return post, nil
}

func (f *fakeRepo) ListAll(_ context.Context, _, _ int) ([]Post, error) {
	return nil, nil
}

func (f *fakeRepo) Create(_ context.Context, in Input) (Post, error) {
	for _, post := range f.posts {
		if post.Slug == in.Slug {
			return Post{}, ErrSlugTaken
		}
	}
	post := Post{ID: "post-1", Slug: in.Slug, Title: in.Title, Tags: in.Tags, Status: in.Status}
	f.posts[post.ID] = post
	return post, nil
}

func (f *fakeRepo) Update(_ context.Context, id string, in Input) (Post, error) {
	if _, ok := f.posts[id]; !ok {
		return Post{}, ErrNotFound
	}
	post := Post{ID: id, Slug: in.Slug, Title: in.Title, Status: in.Status}
	f.posts[id] = post
	return post, nil
}

func (f *fakeRepo) Delete(_ context.Context, id string) error {
	if _, ok := f.posts[id]; !ok {
		return ErrNotFound
	}
	delete(f.posts, id)
	return nil
}

func TestCreateValidates(t *testing.T) {
	service := NewService(newFakeRepo())
	for name, in := range map[string]Input{
		"bad slug":   {Slug: "Hello World!", Title: "T"},
		"empty slug": {Slug: "", Title: "T"},
		"no title":   {Slug: "hello", Title: "  "},
		"too many":   {Slug: "hello", Title: "T", Tags: make([]string, 20)},
	} {
		if _, err := service.Create(context.Background(), in); !errors.Is(err, ErrInvalid) {
			t.Errorf("%s: expected invalid, got %v", name, err)
		}
	}
	post, err := service.Create(context.Background(), Input{Slug: "Hello-World", Title: " Hi ", Tags: []string{"a", "a", " "}, Status: "bogus"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if post.Slug != "hello-world" || post.Title != "Hi" || len(post.Tags) != 1 || post.Status != StatusDraft {
		t.Fatalf("input was not cleaned: %+v", post)
	}
}

func TestCreateRejectsDuplicateSlug(t *testing.T) {
	service := NewService(newFakeRepo())
	in := Input{Slug: "hello", Title: "T"}
	if _, err := service.Create(context.Background(), in); err != nil {
		t.Fatalf("first create: %v", err)
	}
	if _, err := service.Create(context.Background(), in); !errors.Is(err, ErrSlugTaken) {
		t.Fatalf("expected slug taken, got %v", err)
	}
}

func TestGetPublishedRejectsBadSlug(t *testing.T) {
	service := NewService(newFakeRepo())
	if _, err := service.GetPublished(context.Background(), "../etc"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected not found, got %v", err)
	}
}
