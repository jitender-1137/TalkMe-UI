/**
 * Utilities for deciding whether a media URL may be downloaded/cached
 * via the authenticated apiClient (which sends credentials), or whether
 * it must be rendered directly from its origin.
 *
 * External third-party GIF/CDN providers (Giphy, Tenor, …) respond with
 * `Access-Control-Allow-Origin: *`. Our apiClient sends requests with
 * `withCredentials: true`, and the browser forbids a wildcard ACAO header
 * when credentials are included — producing CORS failures, ERR_FAILED
 * network errors, and "[Media Cache] Error caching media" console spam.
 *
 * Such providers serve animated GIFs that are meant to be embedded
 * directly via <img src>, so there is no benefit to blob-caching them.
 */

/**
 * Host suffixes for third-party GIF/media providers that must never be
 * routed through the credentialed apiClient cache. Matched against the
 * URL hostname (exact match or as a dotted suffix, e.g. `media0.giphy.com`).
 */
const EXTERNAL_MEDIA_HOST_SUFFIXES = [
  "giphy.com",
  "giphyusercontent.com",
  "tenor.com",
  "tenor.co",
  "gstatic.com", // tenor media is served from *.gstatic.com
] as const;

/**
 * Returns true when the given URL points at a third-party GIF/CDN provider
 * (Giphy, Tenor, …) whose responses cannot be fetched with credentials.
 * These should be rendered directly from their URL and never cached.
 */
export function isExternalGifProvider(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  // Only absolute http(s) URLs can be cross-origin; relative/blob/data
  // URLs are always same-origin (our own API) and safe to cache.
  if (!/^https?:\/\//i.test(url)) return false;

  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    // Unparseable URL — fall back to a substring check so obviously
    // external GIF URLs are still bypassed rather than retried.
    const lower = url.toLowerCase();
    return EXTERNAL_MEDIA_HOST_SUFFIXES.some((s) => lower.includes(s));
  }

  return EXTERNAL_MEDIA_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
  );
}
