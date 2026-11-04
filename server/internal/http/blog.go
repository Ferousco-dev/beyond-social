package httpserver

import (
	"context"
	"errors"
	"net/http"

	"github.com/Ferousco-dev/beyond-social/server/internal/blog"
	"github.com/google/uuid"
)

// BlogService is the editorial surface. *blog.Service satisfies it.
type BlogService interface {
	ListPublished(ctx context.Context, limit, offset int) ([]blog.Post, error)
	GetPublished(ctx context.Context, slug string) (blog.Post, error)
	Get(ctx context.Context, id string) (blog.Post, error)
	ListAll(ctx context.Context, limit, offset int) ([]blog.Post, error)
	Create(ctx context.Context, in blog.Input) (blog.Post, error)
	Update(ctx context.Context, id string, in blog.Input) (blog.Post, error)
	Delete(ctx context.Context, id string) error
}

type blogInput struct {
	Slug           string   `json:"slug"`
	Title          string   `json:"title"`
	Excerpt        string   `json:"excerpt"`
	Content        string   `json:"content"`
	FeaturedImage  string   `json:"featured_image"`
	Category       string   `json:"category"`
	Tags           []string `json:"tags"`
	SEOTitle       string   `json:"seo_title"`
	SEODescription string   `json:"seo_description"`
	Status         string   `json:"status"`
}

func toBlogInput(req blogInput) blog.Input {
	return blog.Input{
		Slug: req.Slug, Title: req.Title, Excerpt: req.Excerpt, Content: req.Content,
		FeaturedImage: req.FeaturedImage, Category: req.Category, Tags: req.Tags,
		SEOTitle: req.SEOTitle, SEODescription: req.SEODescription, Status: blog.Status(req.Status),
	}
}

// listBlogPosts serves published posts to everyone, no login required.
func (a *App) listBlogPosts(w http.ResponseWriter, r *http.Request) {
	limit, offset, ok := pageParams(w, r)
	if !ok {
		return
	}
	posts, err := a.deps.Blog.ListPublished(r.Context(), limit, offset)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if posts == nil {
		posts = []blog.Post{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data":       posts,
		"pagination": pagination{Limit: limit, Offset: offset, HasMore: len(posts) == limit},
	})
}

// getPost serves one published post by slug, no login required.
func (a *App) getPost(w http.ResponseWriter, r *http.Request) {
	post, err := a.deps.Blog.GetPublished(r.Context(), r.PathValue("slug"))
	switch {
	case errors.Is(err, blog.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "post not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, post)
	}
}

func (a *App) listAllPosts(w http.ResponseWriter, r *http.Request) {
	limit, offset, ok := pageParams(w, r)
	if !ok {
		return
	}
	posts, err := a.deps.Blog.ListAll(r.Context(), limit, offset)
	if err != nil {
		writeInternal(w, r, err)
		return
	}
	if posts == nil {
		posts = []blog.Post{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data":       posts,
		"pagination": pagination{Limit: limit, Offset: offset, HasMore: len(posts) == limit},
	})
}

func (a *App) getAnyPost(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "post id must be a UUID")
		return
	}
	post, err := a.deps.Blog.Get(r.Context(), id)
	switch {
	case errors.Is(err, blog.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "post not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, post)
	}
}

func (a *App) createBlogPost(w http.ResponseWriter, r *http.Request) {
	var req blogInput
	if !decodeJSON(w, r, &req) {
		return
	}
	post, err := a.deps.Blog.Create(r.Context(), toBlogInput(req))
	switch {
	case errors.Is(err, blog.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, blog.ErrSlugTaken):
		writeError(w, http.StatusConflict, "slug_taken", "that slug is already used")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusCreated, post)
	}
}

func (a *App) updatePost(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "post id must be a UUID")
		return
	}
	var req blogInput
	if !decodeJSON(w, r, &req) {
		return
	}
	post, err := a.deps.Blog.Update(r.Context(), id, toBlogInput(req))
	switch {
	case errors.Is(err, blog.ErrInvalid):
		writeError(w, http.StatusBadRequest, "invalid_request", err.Error())
	case errors.Is(err, blog.ErrSlugTaken):
		writeError(w, http.StatusConflict, "slug_taken", "that slug is already used")
	case errors.Is(err, blog.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "post not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		writeData(w, http.StatusOK, post)
	}
}

func (a *App) deletePost(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if _, err := uuid.Parse(id); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "post id must be a UUID")
		return
	}
	switch err := a.deps.Blog.Delete(r.Context(), id); {
	case errors.Is(err, blog.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "post not found")
	case err != nil:
		writeInternal(w, r, err)
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}
