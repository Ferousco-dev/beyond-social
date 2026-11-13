/**
 * Asking for a file in CORS mode makes the browser refuse it outright when its
 * host sends no CORS headers: the element errors, no frame ever arrives and the
 * preview stays black. The preview only shows the picture, it never reads pixels
 * back, so a refused element is asked again without CORS. Export fetches files
 * itself and reports its own error.
 */
const retried = new WeakSet<object>();
export function retryWithoutCors(element: { crossOrigin: string | null }, reload: () => void): boolean {
  if (element.crossOrigin === null || retried.has(element)) return false;
  retried.add(element);
  element.crossOrigin = null;
  reload();
  return true;
}
