"use client";

/**
 * Open/close helper for in-tab modals (profile previews, etc.).
 *
 * ── History-free by design ──────────────────────────────────────────────────
 * This hook used to mirror modal open-state into the URL hash (e.g. "#profile")
 * and close the modal with `window.history.back()`. That approach:
 *   1. Pushed a browser-history entry every time a modal opened, so Back walked
 *      back through modals/tabs instead of leaving the app.
 *   2. Collided with the centralized tab manager (see lib/navigation/url-hash.ts),
 *      where "#profile" now identifies the Profile TAB — a modal writing that
 *      hash would have switched the whole app to the Profile tab.
 *
 * Modals are transient UI and should not live in the browser history at all, so
 * this hook is now purely state-based: it never reads or writes the URL or the
 * history stack. The returned handler simply invokes `onClose`. The signature is
 * kept unchanged so existing call sites need no changes.
 *
 * @param _isOpen     Whether the modal is open (kept for API compatibility).
 * @param onClose     Callback to close the modal.
 * @param _targetHash Unused (kept for API compatibility).
 * @param _fallback   Unused (kept for API compatibility).
 * @returns A close handler that closes via state only — no history entry.
 */
export function useHashSync(
  _isOpen: boolean,
  onClose: () => void,
  _targetHash?: string,
  _fallback: string = ""
) {
  return () => onClose();
}
