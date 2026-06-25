"use client";

import { useEffect, useRef } from "react";
import { FriendsDashboard } from "./friends-dashboard";
import { useUrlModal } from "@/lib/navigation/use-url-modal";
import { useNavigation } from "@/components/app-shell/navigation-context";
import { useChatContext } from "@/components/chat/chat-context";

/**
 * Full-screen Friends overlay opened from the Chats header or the Settings menu.
 *
 * It registers a nested URL segment via `useUrlModal`, so the hash becomes
 * `#chats/friends` or `#profile/friends` depending on the tab it was opened
 * from, and Back (button or browser) returns to the parent tab.
 *
 * If the user navigates elsewhere while it's open — switching tabs, or opening a
 * conversation (e.g. tapping "Message" on a friend, which can happen on the same
 * Chats tab) — the overlay closes itself so it never lingers on top of an
 * unrelated screen.
 */
export function FriendsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const zIndex = useUrlModal(open, onClose, "friends");
  const { activeTab } = useNavigation();
  const { selectedConversationId } = useChatContext();

  // Snapshot the navigation state at open time; close if it changes while open.
  const snapshot = useRef<{ tab: string; conv: string | null } | null>(null);
  useEffect(() => {
    if (open) {
      if (snapshot.current == null) {
        snapshot.current = { tab: activeTab, conv: selectedConversationId };
      }
    } else {
      snapshot.current = null;
    }
  }, [open, activeTab, selectedConversationId]);
  useEffect(() => {
    if (!open || snapshot.current == null) return;
    if (activeTab !== snapshot.current.tab || selectedConversationId !== snapshot.current.conv) {
      onClose();
    }
  }, [open, activeTab, selectedConversationId, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-background" style={{ zIndex }}>
      <FriendsDashboard onBack={onClose} />
    </div>
  );
}
