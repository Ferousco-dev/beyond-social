import { type Metadata } from "next";
import { type ReactNode } from "react";

import { BlogForm } from "@/features/blog/components/blog-form";

export const metadata: Metadata = { title: "Admin · New post" };

export default function AdminBlogNewPage(): ReactNode {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">New post</h1>
      <BlogForm />
    </div>
  );
}
