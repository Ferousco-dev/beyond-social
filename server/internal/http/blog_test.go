package httpserver

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/Ferousco-dev/beyond-social/server/internal/accounts"
	"github.com/Ferousco-dev/beyond-social/server/internal/blog"
)

type fakeBlogService struct {
	posts []blog.Post
	err   error
}

func (f *fakeBlogService) ListPublished(_ context.Context, _, _ int) ([]blog.Post, error) {
	if f.err != nil {
		return nil, f.err
	}
	var out []blog.Post
	for _, post := range f.posts {
		if post.Status == blog.StatusPublished {
			out = append(out, post)
		}
	}
	return out, nil
}

func (f *fakeBlogService) GetPublished(_ context.Context, slug string) (blog.Post, error) {
	if f.err != nil {
		return blog.Post{}, f.err
	}
	for _, post := range f.posts {
		if post.Slug == slug && post.Status == blog.StatusPublished {
			return post, nil
		}
	}
	return blog.Post{}, blog.ErrNotFound
}

func (f *fakeBlogService) Get(_ context.Context, id string) (blog.Post, error) {
	if f.err != nil {
		return blog.Post{}, f.err
	}
	for _, post := range f.posts {
		if post.ID == id {
			return post, nil
		}
	}
	return blog.Post{}, blog.ErrNotFound
}

func (f *fakeBlogService) ListAll(_ context.Context, _, _ int) ([]blog.Post, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.posts, nil
}

func (f *fakeBlogService) Create(_ context.Context, in blog.Input) (blog.Post, error) {
	if f.err != nil {
		return blog.Post{}, f.err
	}
	for _, post := range f.posts {
		if post.Slug == in.Slug {
			return blog.Post{}, blog.ErrSlugTaken
		}
	}
	post := blog.Post{ID: "40000000-0000-4000-8000-000000000001", Slug: in.Slug, Title: in.Title, Status: in.Status}
	f.posts = append(f.posts, post)
	return post, nil
}

func (f *fakeBlogService) Update(_ context.Context, id string, in blog.Input) (blog.Post, error) {
	if f.err != nil {
		return blog.Post{}, f.err
	}
	for i, post := range f.posts {
		if post.ID == id {
			f.posts[i].Title = in.Title
			f.posts[i].Status = in.Status
			return f.posts[i], nil
		}
	}
	return blog.Post{}, blog.ErrNotFound
}

func (f *fakeBlogService) Delete(_ context.Context, id string) error {
	if f.err != nil {
		return f.err
	}
	for i, post := range f.posts {
		if post.ID == id {
			f.posts = append(f.posts[:i], f.posts[i+1:]...)
			return nil
		}
	}
	return blog.ErrNotFound
}

func blogHarness(t *testing.T, svc *fakeBlogService) *harness {
	t.Helper()
	h := newHarness(t, &fakeRepo{}, fakePinger{})
	h.deps.Blog = svc
	h.rebuild()
	return h
}

func samplePost() blog.Post {
	return blog.Post{ID: "40000000-0000-4000-8000-000000000001", Slug: "hello-world", Title: "Hello", Status: blog.StatusPublished}
}

func TestPublicBlogNeedsNoLogin(t *testing.T) {
	h := blogHarness(t, &fakeBlogService{posts: []blog.Post{samplePost()}})

	res := h.get("/api/v1/blog", "")
	if res.Code != http.StatusOK {
		t.Fatalf("public list: expected 200, got %d", res.Code)
	}
	res = h.get("/api/v1/blog/hello-world", "")
	if res.Code != http.StatusOK {
		t.Fatalf("public read: expected 200, got %d", res.Code)
	}
	if res := h.get("/api/v1/blog/nope", ""); res.Code != http.StatusNotFound {
		t.Errorf("missing post: expected 404, got %d", res.Code)
	}
	if res := h.get("/api/v1/blog", h.token(t, alice)); res.Code != http.StatusOK {
		t.Errorf("logged-in list: expected 200, got %d", res.Code)
	}
}

func TestAdminBlogCRUD(t *testing.T) {
	h := blogHarness(t, &fakeBlogService{})
	h.profiles.rows[bob] = accounts.Profile{ID: bob, Role: accounts.RoleAdmin}
	user, admin := h.token(t, alice), h.token(t, bob)

	// Non-admins must not even learn the routes exist.
	if res := h.get("/api/v1/admin/blog", user); res.Code != http.StatusNotFound {
		t.Fatalf("user list: expected 404, got %d", res.Code)
	}

	created := h.post("/api/v1/admin/blog", admin, `{"slug":"hello-world","title":"Hello","status":"published"}`)
	if created.Code != http.StatusCreated {
		t.Fatalf("create: expected 201, got %d: %s", created.Code, created.Body)
	}
	var body struct {
		Data blog.Post `json:"data"`
	}
	_ = json.Unmarshal(created.Body.Bytes(), &body)
	if body.Data.Slug != "hello-world" {
		t.Fatalf("unexpected post %s", created.Body)
	}

	dupe := h.post("/api/v1/admin/blog", admin, `{"slug":"hello-world","title":"Dupe"}`)
	if dupe.Code != http.StatusConflict {
		t.Fatalf("duplicate slug: expected 409, got %d", dupe.Code)
	}

	id := body.Data.ID
	updated := send(h, http.MethodPut, "/api/v1/admin/blog/"+id, admin, `{"slug":"hello-world","title":"Hello again","status":"draft"}`)
	if updated.Code != http.StatusOK {
		t.Fatalf("update: expected 200, got %d: %s", updated.Code, updated.Body)
	}
	// Drafts disappear from the public feed.
	if res := h.get("/api/v1/blog/hello-world", ""); res.Code != http.StatusNotFound {
		t.Fatalf("draft must not be public, got %d", res.Code)
	}
	got := h.get("/api/v1/admin/blog/"+id, admin)
	if got.Code != http.StatusOK || !strings.Contains(got.Body.String(), "Hello again") {
		t.Fatalf("admin read: %d %s", got.Code, got.Body)
	}

	deleted := send(h, http.MethodDelete, "/api/v1/admin/blog/"+id, admin, ``)
	if deleted.Code != http.StatusNoContent {
		t.Fatalf("delete: expected 204, got %d", deleted.Code)
	}
	if res := h.get("/api/v1/admin/blog/"+id, admin); res.Code != http.StatusNotFound {
		t.Fatalf("deleted post: expected 404, got %d", res.Code)
	}
	if res := h.get("/api/v1/admin/blog/not-a-uuid", admin); res.Code != http.StatusBadRequest {
		t.Fatalf("malformed id: expected 400, got %d", res.Code)
	}
}
