/*
 * Service worker.
 *
 * Deliberately small. The job is to make an installed app open when the network
 * is bad, not to mirror the product offline.
 *
 * What is cached: the offline page and immutable build assets under
 * /_next/static, which are content-hashed and so can never go stale.
 *
 * What is never cached: HTML responses and anything under /api, /auth or
 * /dashboard. Those carry the signed-in person's data, and a cache is shared by
 * every profile on the device, so storing them would leak one user's pages to
 * the next. Navigations go to the network and fall back to the offline page.
 */

const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.endsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Content-hashed build output, safe to serve from cache forever. */
function isImmutableAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (!isImmutableAsset(url)) return;

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          // Only complete, same-origin successes are worth keeping; an opaque or
          // partial response cached here would be served back as if it were real.
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(ASSETS).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
