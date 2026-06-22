"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChatFontSize = "small" | "medium" | "large";

interface ChatPrefsState {
  /** When true, Enter sends the message (Shift+Enter = newline). When false, Enter inserts a newline. */
  enterToSend: boolean;
  /** When true, incoming photos/GIFs load automatically; when false they load on tap. */
  mediaAutoDownload: boolean;
  /** Font size applied to chat message bubbles. */
  fontSize: ChatFontSize;
  setEnterToSend: (v: boolean) => void;
  setMediaAutoDownload: (v: boolean) => void;
  setFontSize: (v: ChatFontSize) => void;
}

/** Persisted, app-wide chat preferences (localStorage). Read by the chat input + message list. */
export const useChatPrefs = create<ChatPrefsState>()(
  persist(
    (set) => ({
      enterToSend: true,
      mediaAutoDownload: true,
      fontSize: "medium",
      setEnterToSend: (v) => set({ enterToSend: v }),
      setMediaAutoDownload: (v) => set({ mediaAutoDownload: v }),
      setFontSize: (v) => set({ fontSize: v }),
    }),
    { name: "talkme-chat-prefs" },
  ),
);

/** Maps the font-size preference to a Tailwind text class for message bubbles. */
export const CHAT_FONT_SIZE_CLASS: Record<ChatFontSize, string> = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base",
};
