import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { type ReactNode } from "react";

import { getAnyPost } from "@/features/blog/admin-actions";
import { BlogForm } from "@/features/blog/components/blog-form";

export const metadata: Metadata = { title: "Admin · Edit post" };

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  const result = await getAnyPost(id);
  if (result.status !== "ok") notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Edit post</h1>
      <BlogForm post={result.post} />
    </div>
  );
}
