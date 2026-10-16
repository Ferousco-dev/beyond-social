"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { useState } from "react";

import type { GoBlogPost } from "@/lib/go-api/schemas";

import { BlogArticleBody, type BlogArticleDraft } from "./blog-article-body";
import { createPost, deletePost, updatePost } from "../admin-actions";

const inputClass =
  "h-11 w-full rounded-[10px] border border-hairline bg-paper px-3 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary";
const labelClass = "mb-1.5 block text-sm font-medium text-ink";

/** Create and edit form for one post, including SEO fields. */
export function BlogForm({ post }: { post?: GoBlogPost }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<BlogArticleDraft | null>(null);

  function updatePreview(form: HTMLFormElement | null): void {
    if (!form) return;
    const fields = new FormData(form);
    setPreview({
      category: String(fields.get("category") ?? ""),
      title: String(fields.get("title") ?? ""),
      excerpt: String(fields.get("excerpt") ?? ""),
      content: String(fields.get("content") ?? ""),
      featuredImage: String(fields.get("featured_image") ?? ""),
    });
  }

  async function onSubmit(form: FormData): Promise<void> {
    setBusy(true);
    setError(null);
    const tags = String(form.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");
    const input = {
      slug: String(form.get("slug") ?? ""),
      title: String(form.get("title") ?? ""),
      excerpt: String(form.get("excerpt") ?? ""),
      content: String(form.get("content") ?? ""),
      featured_image: String(form.get("featured_image") ?? ""),
      category: String(form.get("category") ?? ""),
      tags,
      seo_title: String(form.get("seo_title") ?? ""),
      seo_description: String(form.get("seo_description") ?? ""),
      status: (String(form.get("status")) === "published" ? "published" : "draft") as "draft" | "published",
    };
    const result = post ? await updatePost(post.id, input) : await createPost(input);
    if (result.status !== "ok") {
      setBusy(false);
      setError(result.status === "unconfigured" ? "The backend is not connected yet." : result.message);
      return;
    }
    router.push("/dashboard/admin/blog");
    router.refresh();
  }

  async function onDelete(): Promise<void> {
    if (!post || !window.confirm(`Delete "${post.title}"?`)) return;
    setBusy(true);
    const result = await deletePost(post.id);
    if (result.status !== "ok") {
      setBusy(false);
      setError(result.message);
      return;
    }
    router.push("/dashboard/admin/blog");
    router.refresh();
  }

  return (
    <form
      action={(form) => void onSubmit(form)}
      className="mt-6 flex max-w-2xl flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="blog-slug">Slug</label>
          <input id="blog-slug" name="slug" required defaultValue={post?.slug ?? ""} placeholder="hello-world" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="blog-status">Status</label>
          <select id="blog-status" name="status" defaultValue={post?.status ?? "draft"} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>
      {post?.published_at ? (
        <p className="text-xs text-ink-soft">
          Published {new Date(post.published_at).toLocaleDateString("en-US")}. Saving as a draft unpublishes it; publishing again records a new date.
        </p>
      ) : null}
      <div>
        <label className={labelClass} htmlFor="blog-title">Title</label>
        <input id="blog-title" name="title" required defaultValue={post?.title ?? ""} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="blog-excerpt">Excerpt</label>
        <textarea id="blog-excerpt" name="excerpt" rows={2} defaultValue={post?.excerpt ?? ""} className="w-full rounded-[10px] border border-hairline bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary" />
      </div>
      <div>
        <label className={labelClass} htmlFor="blog-content">Content</label>
        <textarea id="blog-content" name="content" rows={12} defaultValue={post?.content ?? ""} className="w-full rounded-[10px] border border-hairline bg-paper px-3 py-2.5 font-mono text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-offset-2 focus:outline-primary" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="blog-category">Category</label>
          <input id="blog-category" name="category" defaultValue={post?.category ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="blog-tags">Tags (comma separated)</label>
          <input id="blog-tags" name="tags" defaultValue={post?.tags.join(", ") ?? ""} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="blog-image">Featured image URL</label>
        <input id="blog-image" name="featured_image" type="url" defaultValue={post?.featured_image ?? ""} className={inputClass} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="blog-seo-title">SEO title</label>
          <input id="blog-seo-title" name="seo_title" defaultValue={post?.seo_title ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="blog-seo-desc">SEO description</label>
          <input id="blog-seo-desc" name="seo_description" defaultValue={post?.seo_description ?? ""} className={inputClass} />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={(event) => updatePreview(event.currentTarget.form)}
          disabled={busy}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-hairline px-4 text-sm font-medium text-ink hover:bg-cloud disabled:opacity-40"
        >
          <Eye className="size-4" aria-hidden />
          {preview ? "Refresh preview" : "Preview"}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {post ? "Save changes" : "Create post"}
        </button>
        {post ? (
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={busy}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-hairline px-5 text-sm font-medium text-destructive transition-colors hover:bg-cloud disabled:opacity-40"
          >
            Delete
          </button>
        ) : null}
      </div>
      {preview ? (
        <section aria-label="Unpublished article preview" className="border-t border-hairline pt-6">
          <p className="text-xs font-medium uppercase text-ink-soft">Preview · not published</p>
          {preview.category ? <p className="mt-4 text-xs font-medium uppercase text-primary">{preview.category}</p> : null}
          <h2 className="mt-2 text-xl font-semibold text-ink">{preview.title || "Untitled post"}</h2>
          {preview.excerpt ? <p className="mt-2 text-sm text-ink-soft">{preview.excerpt}</p> : null}
          <div className="mt-6"><BlogArticleBody post={preview} /></div>
        </section>
      ) : null}
    </form>
  );
}
