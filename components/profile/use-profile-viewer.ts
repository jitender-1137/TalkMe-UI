"use client";

import { useCallback } from "react";
import { useImageViewer } from "@/components/providers";
import { useChatContext } from "@/components/chat/chat-context";
import { getAvatarUrl } from "@/lib/utils";
import type { ChatContact } from "@/components/chat/types";

/**
 * App-wide profile interaction convention (2026-06-28):
 *   • tapping a profile PHOTO  → opens the image modal (the enlarged avatar)
 *   • tapping a DISPLAY NAME   → opens the full user-profile modal
 *
 * Use this hook at every avatar/name render site so the behavior is identical
 * everywhere. Must be used inside the app shell (ChatProvider + the global
 * ImageViewerProvider) — i.e. anywhere in the authenticated app.
 */
export function useProfileViewer() {
  const { showImage } = useImageViewer();
  const { setProfileModal } = useChatContext();

  /** Avatar tap → enlarge the photo (always — even the gender/placeholder image). */
  const openPhoto = useCallback(
    (avatar?: string | null, gender?: string | null) => {
      const url = getAvatarUrl(avatar, gender);
      if (url) showImage(url);
    },
    [showImage],
  );

  /** Display-name tap → open the user-profile modal (by id, with optional contact). */
  const openProfile = useCallback(
    (opts: { userId?: string | null; contact?: ChatContact | null }) => {
      setProfileModal({ contact: opts.contact ?? null, userId: opts.userId ?? null });
    },
    [setProfileModal],
  );

  return { openPhoto, openProfile };
}
