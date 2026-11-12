import { type Route } from "next";
import { redirect } from "next/navigation";

/** Credits and their history now live in settings; payment returns still land here and are carried across. */
export default async function MovedCredits({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<never> {
  const query = new URLSearchParams(Object.entries(await searchParams).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]])));
  const tail = query.size > 0 ? `?${query.toString()}` : "";
  redirect(`/dashboard/settings/billing${tail}` as Route);
}
