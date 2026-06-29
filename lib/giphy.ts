/**
 * Centralized Giphy configuration.
 *
 * The API key is read from `NEXT_PUBLIC_GIPHY_API_KEY`. Note that any key
 * used for client-side Giphy requests is necessarily visible in the browser;
 * keeping it in an env var (rather than hardcoded in components) lets us
 * rotate it without code changes and keeps a single source of truth.
 *
 * The fallback is Giphy's public beta key, which is heavily rate-limited and
 * intended only as a last resort for local development.
 */
const GIPHY_API_KEY =
  process.env.NEXT_PUBLIC_GIPHY_API_KEY || "dc6zaTOxFJmzC";

const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

/**
 * Strictest Giphy content rating we ever request. Giphy filters out anything above
 * this server-side, so explicit (r / pg-13) GIFs never reach the client — the primary
 * guard that keeps non-clean GIFs out of chats (see also the per-result + keyword
 * guards in the picker). "pg" allows ordinary expressive GIFs while excluding adult.
 */
export const GIPHY_MAX_RATING = "pg" as const;

/**
 * Build a Giphy search/trending request URL. When `query` is empty the
 * trending endpoint is used; otherwise the search endpoint. A content `rating`
 * cap is ALWAYS applied (search AND trending) so explicit GIFs are excluded.
 */
export function buildGiphyUrl(
  query: string,
  { limit = 24, offset = 0, rating = GIPHY_MAX_RATING }: { limit?: number; offset?: number; rating?: string } = {}
): string {
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    limit: String(limit),
    offset: String(offset),
    rating,
  });

  if (query.trim()) {
    params.set("q", query.trim());
    return `${GIPHY_BASE}/search?${params.toString()}`;
  }

  return `${GIPHY_BASE}/trending?${params.toString()}`;
}
