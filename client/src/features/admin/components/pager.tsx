import { type Route } from "next";
import Link from "next/link";
import { type ReactNode } from "react";

/** How many rows an admin list shows at once. */
export const ADMIN_PAGE_SIZE = 20;

/** Reads `?page=` as a whole number from 1 up. */
export function pageNumber(raw: string | undefined): number {
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1;
}

export function pageOffset(page: number): number {
  return (page - 1) * ADMIN_PAGE_SIZE;
}

function href(path: string, params: Readonly<Record<string, string>>, page: number, key: string): Route {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== ""));
  if (page > 1) query.set(key, String(page));
  const text = query.toString();
  return (text ? `${path}?${text}` : path) as Route;
}

/** Previous and next links for a list the server reads one page at a time. */
export function Pager({ path, params = {}, page, hasMore, param = "page" }: { readonly path: string; readonly params?: Readonly<Record<string, string>>; readonly page: number; readonly hasMore: boolean; /** The query key that holds this list's page, so a screen can hold more than one list. */ readonly param?: string }): ReactNode {
  if (page === 1 && !hasMore) return null;
  const link = "inline-flex h-10 items-center rounded-lg border border-hairline px-4 text-sm font-medium text-ink hover:bg-cloud focus-visible:outline-2 focus-visible:outline-primary";
  const off = "inline-flex h-10 items-center rounded-lg border border-hairline px-4 text-sm text-ink-soft opacity-50";
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3">
      {page > 1 ? <Link href={href(path, params, page - 1, param)} className={link}>Previous</Link> : <span className={off} aria-disabled="true">Previous</span>}
      <span className="text-sm tabular-nums text-ink-soft">Page {page}</span>
      {hasMore ? <Link href={href(path, params, page + 1, param)} className={link}>Next</Link> : <span className={off} aria-disabled="true">Next</span>}
    </nav>
  );
}
