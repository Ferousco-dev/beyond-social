package database

import (
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/blog"
)

func TestBlogPostsRoundTrip(t *testing.T) {
	pool := testPool(t)
	ctx := t.Context()
	store := NewBlogStore(pool)

	draft, err := store.Create(ctx, blog.Input{Slug: "hello-world", Title: "Hello", Excerpt: "E", Content: "Body", Category: "Notes", Tags: []string{"a"}, SEOTitle: "SEO", SEODescription: "Desc", Status: blog.StatusDraft})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if draft.Status != blog.StatusDraft || draft.PublishedAt != nil {
		t.Fatalf("draft should be unpublished: %+v", draft)
	}

	// Drafts stay invisible on the public reads.
	if _, err := store.GetPublished(ctx, "hello-world"); err == nil {
		t.Fatal("draft must not be publicly readable")
	}
	published, err := store.ListPublished(ctx, 10, 0)
	if err != nil || len(published) != 0 {
		t.Fatalf("no published posts expected: %v %d", err, len(published))
	}

	updated, err := store.Update(ctx, draft.ID, blog.Input{Slug: "hello-world", Title: "Hello!", Tags: []string{"a"}, Status: blog.StatusPublished})
	if err != nil {
		t.Fatalf("publish: %v", err)
	}
	if updated.PublishedAt == nil {
		t.Fatal("publishing should stamp published_at")
	}
	got, err := store.GetPublished(ctx, "hello-world")
	if err != nil || got.Title != "Hello!" {
		t.Fatalf("public read after publish: %v %+v", err, got)
	}

	if _, err := store.Create(ctx, blog.Input{Slug: "hello-world", Title: "Dupe"}); err == nil {
		t.Fatal("duplicate slug must fail")
	}

	if err := store.Delete(ctx, draft.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := store.Get(ctx, draft.ID); err == nil {
		t.Fatal("deleted post must be gone")
	}
}
