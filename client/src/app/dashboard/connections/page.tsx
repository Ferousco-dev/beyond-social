import { redirect } from "next/navigation";
import { type Route } from "next";

/**
 * Connections moved into settings. The old address stays because a sign-in
 * round trip from an earlier deploy still returns here; the outcome in the
 * query is carried across.
 */
export default async function MovedConnections({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<never> {
  const query = new URLSearchParams(Object.entries(await searchParams).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]])));
  const tail = query.size > 0 ? `?${query.toString()}` : "";
  redirect(`/dashboard/settings/connections${tail}` as Route);
}
