import { type NextRequest, NextResponse } from "next/server";

import { toCsv } from "@/features/usage/lib/csv";
import { getUsageReport } from "@/features/usage/lib/queries";
import { parseRange } from "@/features/usage/lib/range";
import { getAuthUser } from "@/lib/supabase/session";

/**
 * The rows behind the chart, as a file.
 *
 * It calls the same `getUsageReport` the page renders from, so the download
 * cannot drift away from what was on screen when it was clicked.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const range = parseRange(request.nextUrl.searchParams.get("range") ?? undefined);
  const report = await getUsageReport(range);

  return new NextResponse(toCsv(report.rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="usage-${range}.csv"`,
      "cache-control": "no-store",
    },
  });
}
