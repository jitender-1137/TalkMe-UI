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
 * Build a Giphy search/trending request URL. When `query` is empty the
 * trending endpoint is used; otherwise the search endpoint.
 */
export function buildGiphyUrl(
  query: string,
  { limit = 24, offset = 0 }: { limit?: number; offset?: number } = {}
): string {
  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    limit: String(limit),
    offset: String(offset),
  });

  if (query.trim()) {
    params.set("q", query.trim());
    return `${GIPHY_BASE}/search?${params.toString()}`;
  }

  return `${GIPHY_BASE}/trending?${params.toString()}`;
}
