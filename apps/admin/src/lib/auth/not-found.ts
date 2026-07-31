import { NextResponse } from "next/server";

const BODY = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>404</title></head><body><h1>404</h1><p>This page could not be found.</p></body></html>`;

/**
 * The single response every refused request gets, whatever the path.
 *
 * Returned byte for byte for a forbidden route and for a route that does not
 * exist, so a signed-in non-admin probing the host cannot tell the console
 * apart from an application with no pages at all. A 403 would answer the only
 * question the prober actually has.
 */
export function notFoundResponse(): NextResponse {
  return new NextResponse(BODY, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
