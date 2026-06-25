"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useHasBlockingOverlay } from "./use-url-modal";

/**
 * In-memory (NOT localStorage) per-key scroll-position store.
 *
 * Tabs unmount when you switch away from them and modals unmount when closed, so
 * their scroll containers lose `scrollTop`. This store lives at the app root and
 * survives those unmounts for the lifetime of the session, letting each tab /
 * modal / list restore exactly where the user left off. It intentionally resets
 * on a full reload — positions are session state, not persisted preferences.
 */
type ScrollStore = Map<string, number>;

// Module-level fallback so the hook works even when rendered outside the
// provider — e.g. when a standalone route page (used by `output: export`
// prerendering) mounts a dashboard directly without the AppShell tree.
const fallbackStore: ScrollStore = new Map();

const ScrollRestoreContext = createContext<ScrollStore | null>(null);

export function ScrollRestoreProvider({ children }: { children: ReactNode }) {
  // A ref-held Map: stable identity, no re-renders when positions change.
  const storeRef = useRef<ScrollStore>(new Map());
  return (
    <ScrollRestoreContext.Provider value={storeRef.current}>
      {children}
    </ScrollRestoreContext.Provider>
  );
}

function useScrollStore(): ScrollStore {
  return useContext(ScrollRestoreContext) ?? fallbackStore;
}

interface ScrollRestoreOptions {
  /**
   * When true, the container stops scrolling while a blocking modal/overlay is
   * open (so the background behind a modal can't scroll) and resumes afterwards,
   * preserving its position. Use for tab-level scrollers, NOT for the modal's own
   * scroller.
   */
  lockWhenOverlay?: boolean;
  /** Disable the hook entirely (e.g. while content is still loading). */
  enabled?: boolean;
}

/**
 * Preserve and restore the scroll position of a container across unmounts,
 * keyed by a stable string. Pass the SAME ref you attach to the scrollable
 * element.
 *
 *   const ref = useRef<HTMLDivElement>(null);
 *   useScrollRestore(ref, "tab:news");
 *   return <div ref={ref} className="overflow-y-auto">…</div>;
 *
 * Async lists (React Query) grow after mount, so restoration re-applies the
 * saved offset across a short window of animation frames until the content is
 * tall enough — and bails the moment the user scrolls, so it never fights them.
 */
export function useScrollRestore(
  ref: RefObject<HTMLElement | null>,
  key: string,
  options: ScrollRestoreOptions = {},
): void {
  const { lockWhenOverlay = false, enabled = true } = options;
  const store = useScrollStore();
  const locked = useHasBlockingOverlay();

  // Save + restore. Re-runs only when the key (or enabled) changes — NOT on every
  // overlay toggle — so an open modal never wipes the saved position.
  useLayoutEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const saved = store.get(key) ?? 0;
    let userInteracted = false;
    let cancelled = false;
    let rafId = 0;

    const tryRestore = (attemptsLeft: number) => {
      if (cancelled || userInteracted || saved <= 0) return;
      el.scrollTop = saved;
      // Reached it (within a px) or content still too short to ever reach it.
      if (Math.abs(el.scrollTop - saved) <= 2 || attemptsLeft <= 0) return;
      rafId = requestAnimationFrame(() => tryRestore(attemptsLeft - 1));
    };
    // ~1s of frames is plenty for query results / images to land.
    tryRestore(60);

    const onScroll = () => store.set(key, el.scrollTop);
    const onUserScroll = () => {
      userInteracted = true;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onUserScroll, { passive: true });
    el.addEventListener("touchmove", onUserScroll, { passive: true });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      // Final save on unmount (tab switch / modal close).
      store.set(key, el.scrollTop);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onUserScroll);
      el.removeEventListener("touchmove", onUserScroll);
    };
  }, [key, enabled, store, ref]);

  // Background scroll-lock while a modal/overlay is open (opt-in for tabs).
  useEffect(() => {
    if (!lockWhenOverlay || !enabled) return;
    const el = ref.current;
    if (!el) return;
    if (locked) {
      const top = el.scrollTop;
      const prev = el.style.overflowY;
      el.style.overflowY = "hidden";
      el.scrollTop = top; // overflow:hidden keeps content; pin the offset
      return () => {
        el.style.overflowY = prev;
        el.scrollTop = top;
      };
    }
  }, [locked, lockWhenOverlay, ref]);
}
