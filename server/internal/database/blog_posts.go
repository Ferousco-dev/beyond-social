package database

import (
	"context"
	"errors"

	"github.com/Ferousco-dev/beyond-social/server/internal/blog"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	pgUniqueViolation = "23505"

	blogColumns = `id::text, slug, title, excerpt, content, featured_image, category, tags,
		seo_title, seo_description, status, published_at, created_at, updated_at`
)

// BlogStore persists editorial posts. Reads are public by status; writes go
// through admin-only routes.
type BlogStore struct {
	pool *pgxpool.Pool
}

func NewBlogStore(pool *pgxpool.Pool) *BlogStore { return &BlogStore{pool: pool} }

func (s *BlogStore) ListPublished(ctx context.Context, limit, offset int) ([]blog.Post, error) {
	return s.list(ctx, `where status = 'published' order by published_at desc nulls last, created_at desc limit $1 offset $2`, limit, offset)
}

func (s *BlogStore) ListAll(ctx context.Context, limit, offset int) ([]blog.Post, error) {
	return s.list(ctx, `order by updated_at desc limit $1 offset $2`, limit, offset)
}

func (s *BlogStore) list(ctx context.Context, clause string, limit, offset int) ([]blog.Post, error) {
	rows, err := s.pool.Query(ctx, `select `+blogColumns+` from public.blog_posts `+clause, limit, offset)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	posts := make([]blog.Post, 0)
	for rows.Next() {
		post, err := scanBlogPost(rows)
		if err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	return posts, rows.Err()
}

func (s *BlogStore) GetPublished(ctx context.Context, slug string) (blog.Post, error) {
	post, err := scanBlogPost(s.pool.QueryRow(ctx, `
		select `+blogColumns+` from public.blog_posts where slug = $1 and status = 'published'`, slug))
	if err != nil {
		return blog.Post{}, blogErr(err)
	}
	return post, nil
}

func (s *BlogStore) Get(ctx context.Context, id string) (blog.Post, error) {
	post, err := scanBlogPost(s.pool.QueryRow(ctx, `
		select `+blogColumns+` from public.blog_posts where id = $1`, id))
	if err != nil {
		return blog.Post{}, blogErr(err)
	}
	return post, nil
}

func (s *BlogStore) Create(ctx context.Context, in blog.Input) (blog.Post, error) {
	post, err := scanBlogPost(s.pool.QueryRow(ctx, `
		insert into public.blog_posts (slug, title, excerpt, content, featured_image, category, tags, seo_title, seo_description, status, published_at)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			case when $10 = 'published' then now() else null end)
		returning `+blogColumns,
		in.Slug, in.Title, in.Excerpt, in.Content, in.FeaturedImage, in.Category, in.Tags,
		in.SEOTitle, in.SEODescription, string(in.Status)))
	if err != nil {
		return blog.Post{}, blogErr(err)
	}
	return post, nil
}

func (s *BlogStore) Update(ctx context.Context, id string, in blog.Input) (blog.Post, error) {
	post, err := scanBlogPost(s.pool.QueryRow(ctx, `
		update public.blog_posts set
			slug = $2, title = $3, excerpt = $4, content = $5, featured_image = $6,
			category = $7, tags = $8, seo_title = $9, seo_description = $10, status = $11,
			published_at = case
				when $11 = 'published' and published_at is null then now()
				when $11 = 'draft' then null
				else published_at end,
			updated_at = now()
		where id = $1
		returning `+blogColumns,
		id, in.Slug, in.Title, in.Excerpt, in.Content, in.FeaturedImage, in.Category, in.Tags,
		in.SEOTitle, in.SEODescription, string(in.Status)))
	if err != nil {
		return blog.Post{}, blogErr(err)
	}
	return post, nil
}

func (s *BlogStore) Delete(ctx context.Context, id string) error {
	result, err := s.pool.Exec(ctx, `delete from public.blog_posts where id = $1`, id)
	if err != nil {
		return mapError(err)
	}
	if result.RowsAffected() == 0 {
		return blog.ErrNotFound
	}
	return nil
}

// blogErr maps storage failures onto blog errors: missing or malformed ids
// read as not found, duplicate slugs as taken.
func blogErr(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return blog.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case pgInvalidTextRepresentation:
			return blog.ErrNotFound
		case pgUniqueViolation:
			return blog.ErrSlugTaken
		}
	}
	return err
}

func scanBlogPost(row pgx.Row) (blog.Post, error) {
	var (
		post   blog.Post
		status string
	)
	err := row.Scan(&post.ID, &post.Slug, &post.Title, &post.Excerpt, &post.Content,
		&post.FeaturedImage, &post.Category, &post.Tags, &post.SEOTitle, &post.SEODescription,
		&status, &post.PublishedAt, &post.CreatedAt, &post.UpdatedAt)
	if err != nil {
		return blog.Post{}, mapError(err)
	}
	post.Status = blog.Status(status)
	return post, nil
}
