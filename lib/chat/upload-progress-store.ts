"use client";

import { create } from "zustand";

/**
 * Per-message upload progress (WhatsApp-style). Keyed by the optimistic message's
 * clientId (== its temp messageId), so each media bubble shows its OWN progress
 * ring while its file uploads in the background. Kept out of Dexie on purpose:
 * progress ticks are frequent and transient, so writing them to IndexedDB would
 * spam the message live-query. The entry is cleared when the upload finishes.
 */
interface UploadProgressState {
  /** messageId (optimistic clientId) → percent 0..100 */
  map: Record<string, number>;
  setProgress: (id: string, pct: number) => void;
  clearProgress: (id: string) => void;
}

export const useUploadProgress = create<UploadProgressState>((set) => ({
  map: {},
  setProgress: (id, pct) =>
    set((s) => (s.map[id] === pct ? s : { map: { ...s.map, [id]: pct } })),
  clearProgress: (id) =>
    set((s) => {
      if (!(id in s.map)) return s;
      const next = { ...s.map };
      delete next[id];
      return { map: next };
    }),
}));
