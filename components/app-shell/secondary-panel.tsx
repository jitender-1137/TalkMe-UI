"use client";

import { useState, useCallback, useEffect, useMemo, memo } from "react";
import {
  Search,
  MoreVertical,
  Plus,
  Pin,
  BellOff,
  ChevronLeft,
  Archive,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarStatusBadge } from "@/components/presence";
import { useLivePresence } from "@/lib/presence/live-status-store";
import { MessageStatusIcon } from "@/components/chat/message-status";
import type { MessageStatus } from "@/components/chat/types";
import { ConversationContextMenu } from "@/components/chat/conversation-context-menu";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/src/api/query-keys";
import type { ChatContact } from "@/components/chat/types";
import { cn } from "@/lib/utils";
import { displayContent } from "@/lib/shared-post";
import { useChatContext } from "@/components/chat/chat-context";
import { useLongPress } from "@/hooks/use-long-press";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { useAuth } from "./auth-context";
import { AppLayout } from "@/components/ui/app-layout";
import {
  useChats,
  useMuteChat,
  useUnmuteChat,
  useArchiveChat,
  useUnarchiveChat,
  usePinChat,
  useUnpinChat,
  useDeleteChat,
  useMarkChatAsRead,
} from "@/src/api/hooks/useChats";
import { useBlockUser } from "@/src/api/hooks/useProfile";
import type { Chat } from "@/src/api/types";
import { useWebSocket } from "@/components/providers";
import { useNavigation } from "./navigation-context";

interface ConvItemProps {
  conversation: Chat;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (e: PointerEvent | MouseEvent, id: string) => void;
  currentUserId: string | undefined;
  isTyping?: boolean;
}

const formatRelativeTime = (dateStr: string | undefined | null) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};

/**
 * Skip re-rendering a row unless something it actually displays changed. Dexie's
 * live query emits a brand-new array (and new chat objects) on every update, and
 * the parent re-renders on unrelated state — without this, every row re-rendered
 * and its status/last-message appeared to "flip". Function props (onSelect/
 * onContextMenu) are intentionally ignored: they only ever act on this row's id.
 * Live presence is read via a hook inside the row, so this row still updates the
 * instant ITS user's presence changes — it just no longer re-renders for others'.
 */
/** Compare the display-relevant fields of the participant lists (used as the
 *  1:1 fallback when otherUser is absent, and for group membership changes). */
function participantsEqual(a: Chat["participants"], b: Chat["participants"]): boolean {
  if (a === b) return true;
  const al = a?.length ?? 0;
  const bl = b?.length ?? 0;
  if (al !== bl) return false;
  for (let i = 0; i < al; i++) {
    const pa = a![i] as { id?: string; name?: string; username?: string; avatar?: string | null; presence?: string; gender?: string | null };
    const pb = b![i] as { id?: string; name?: string; username?: string; avatar?: string | null; presence?: string; gender?: string | null };
    if (pa.id !== pb.id) return false;
    if (pa.name !== pb.name) return false;
    if (pa.username !== pb.username) return false;
    if (pa.avatar !== pb.avatar) return false;
    if (pa.presence !== pb.presence) return false;
    if (pa.gender !== pb.gender) return false;
  }
  return true;
}

function areConvItemPropsEqual(prev: ConvItemProps, next: ConvItemProps): boolean {
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isTyping !== next.isTyping) return false;
  if (prev.currentUserId !== next.currentUserId) return false;
  const a = prev.conversation;
  const b = next.conversation;
  if (a === b) return true;
  if (a.id !== b.id) return false;
  if (a.name !== b.name) return false;
  if (a.avatar !== b.avatar) return false;
  // Chat type drives how the row is derived (1:1 otherUser vs group participants).
  if ((a.chatType ?? a.type) !== (b.chatType ?? b.type)) return false;
  if (!participantsEqual(a.participants, b.participants)) return false;
  if ((a.unreadCount ?? 0) !== (b.unreadCount ?? 0)) return false;
  if ((a.muted ?? a.isMuted) !== (b.muted ?? b.isMuted)) return false;
  if ((a.pinned ?? a.isPinned) !== (b.pinned ?? b.isPinned)) return false;
  if ((a.archived ?? a.isArchived) !== (b.archived ?? b.isArchived)) return false;
  if (a.updatedAt !== b.updatedAt) return false;
  const am = a.lastMessage;
  const bm = b.lastMessage;
  if (am?.content !== bm?.content) return false;
  if (am?.timestamp !== bm?.timestamp) return false;
  if (am?.status !== bm?.status) return false;
  if (am?.isDeleted !== bm?.isDeleted) return false;
  if (am?.senderId !== bm?.senderId) return false;
  const ap = a.otherUser;
  const bp = b.otherUser;
  if (ap?.id !== bp?.id) return false;
  if (ap?.name !== bp?.name) return false;
  if (ap?.avatar !== bp?.avatar) return false;
  if (ap?.presence !== bp?.presence) return false;
  if (ap?.gender !== bp?.gender) return false;
  return true;
}

const ConversationItem = memo(function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  onContextMenu,
  currentUserId,
  isTyping = false,
}: ConvItemProps) {
  const [isPressed, setIsPressed] = useState(false);

  const longPressHandlers = useLongPress({
    delay: 300,
    onLongPress: (e) => {
      setIsPressed(false);
      onContextMenu(e, conversation.id);
    },
    onClick: () => onSelect(),
  });

  const isGroup = conversation.chatType === "GROUP" || conversation.type === "group";
  const otherParticipant =
    conversation.otherUser ?? conversation.participants?.find((p) => p.id !== currentUserId);
  const displayName = isGroup
    ? (conversation.name ?? "Group Chat")
    : otherParticipant?.name || otherParticipant?.username || "Unknown User";
  // Real-time presence from the shared global store (falls back to the chat's
  // stored value until the first live update arrives).
  const livePresence = useLivePresence(otherParticipant?.id);
  const displayStatus = isGroup
    ? "online"
    : (livePresence?.status ?? otherParticipant?.presence ?? "offline");
  const lastMessageText = conversation.lastMessage
    ? conversation.lastMessage.isDeleted
      ? "This message was deleted"
      : displayContent(conversation.lastMessage.content)
    : "No messages yet";
  const lastMessageTime = conversation.lastMessage
    ? formatRelativeTime(conversation.lastMessage.timestamp)
    : formatRelativeTime(conversation.updatedAt);
  // Show a delivery tick (sent/delivered/seen) only for the LAST message that the
  // current user sent in a 1:1 chat — same as WhatsApp's chat list.
  const lastMsg = conversation.lastMessage;
  const showLastMsgStatus =
    !!lastMsg && !isGroup && !lastMsg.isDeleted && lastMsg.senderId === currentUserId && !!lastMsg.status;

  return (
    <motion.div
      animate={{ scale: isPressed ? 0.98 : 1 }}
      transition={{ duration: 0.1 }}
      {...longPressHandlers}
      onPointerDown={(e) => {
        setIsPressed(true);
        longPressHandlers.onPointerDown(e);
      }}
      onPointerUp={(e) => {
        setIsPressed(false);
        longPressHandlers.onPointerUp(e);
      }}
      onPointerLeave={(e) => {
        setIsPressed(false);
        longPressHandlers.onPointerLeave(e);
      }}
      onPointerCancel={(e) => {
        setIsPressed(false);
        longPressHandlers.onPointerCancel(e);
      }}
      onContextMenu={longPressHandlers.onContextMenu}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left cursor-pointer select-none border-b border-border/40 dark:border-white/5",
        isSelected
          ? "bg-primary/10"
          : "hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 active:scale-[0.98]",
      )}
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", touchAction: "manipulation" }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      aria-label={`Open conversation with ${displayName}`}
    >
      <AvatarStatusBadge
        src={conversation.avatar || otherParticipant?.avatar || undefined}
        gender={otherParticipant?.gender}
        fallback={displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)}
        status={displayStatus}
        size="lg"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-foreground truncate">{displayName}</span>
          <span className="text-xs text-muted-foreground shrink-0">{lastMessageTime}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {isTyping ? (
            <p className="text-sm text-emerald-500 font-medium animate-pulse truncate">typing...</p>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              {showLastMsgStatus && (
                <MessageStatusIcon status={lastMsg!.status as MessageStatus} className="shrink-0" />
              )}
              <p className="text-sm text-muted-foreground truncate">{lastMessageText}</p>
            </div>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            {(conversation.muted || conversation.isMuted) && (
              <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {(conversation.pinned || conversation.isPinned) && (
              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {conversation.unreadCount > 0 && (
              <span className="shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1.5">
                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}, areConvItemPropsEqual);

export function SecondaryPanel() {
  const { user } = useAuth();
  const { setActiveTab } = useNavigation();
  const {
    selectedConversationId,
    setSelectedConversationId,
    setShowMobileSecondaryPanel,
    setProfileModal,
    setChatReturnTab,
  } = useChatContext();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTarget, setMenuTarget] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewArchived, setViewArchived] = useState(false);
  const queryClient = useQueryClient();

  const { registerHandler } = useWebSocket();
  const [typingChats, setTypingChats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const cleanupStarted = registerHandler("typing_started", (payload: any) => {
      const isSelf = payload.userId === user?.id
      console.log("[TYPING UI] SecondaryPanel received typing_started event:", {
        currentLoggedInUserId: user?.id,
        chatId: payload.chatId,
        senderId: payload.userId,
        ignored: isSelf ? "YES" : "NO",
        reason: isSelf ? "Self typing event" : "None"
      })
      if (payload.chatId && !isSelf) {
        setTypingChats((prev) => ({ ...prev, [payload.chatId]: true }));
      }
    });

    const cleanupStopped = registerHandler("typing_stopped", (payload: any) => {
      const isSelf = payload.userId === user?.id
      console.log("[TYPING UI] SecondaryPanel received typing_stopped event:", {
        currentLoggedInUserId: user?.id,
        chatId: payload.chatId,
        senderId: payload.userId,
        ignored: isSelf ? "YES" : "NO",
        reason: isSelf ? "Self typing event" : "None"
      })
      if (payload.chatId && !isSelf) {
        setTypingChats((prev) => ({ ...prev, [payload.chatId]: false }));
      }
    });

    return () => {
      cleanupStarted();
      cleanupStopped();
    };
  }, [registerHandler, user?.id]);

  const { data: conversations = [], isLoading } = useChats();
  const muteMutation = useMuteChat();
  const unmuteMutation = useUnmuteChat();
  const archiveMutation = useArchiveChat();
  const unarchiveMutation = useUnarchiveChat();
  const pinMutation = usePinChat();
  const unpinMutation = useUnpinChat();
  const deleteMutation = useDeleteChat();
  const markReadMutation = useMarkChatAsRead();
  const blockUserMutation = useBlockUser();

  const targetChat = conversations.find((c) => c.id === menuTarget);
  const targetIsGroup = targetChat?.chatType === "GROUP" || targetChat?.type === "group";
  const otherParticipant =
    targetChat?.otherUser ?? targetChat?.participants?.find((p) => p.id !== user?.id);
  const targetName = targetChat
    ? targetIsGroup
      ? (targetChat.name ?? "Group Chat")
      : otherParticipant?.name || otherParticipant?.username || "Unknown User"
    : "";

  const contactForModal: ChatContact | undefined = targetChat
    ? {
        id: targetChat.id,
        name: targetName,
        avatar: targetChat.avatar || otherParticipant?.avatar || undefined,
        gender: otherParticipant?.gender || undefined,
        activity: "offline",
        isFriend: true,
      }
    : undefined;

  const filteredConversations = useMemo(() => conversations
    .filter((c) => {
      const isGroupChat = c.chatType === "GROUP" || c.type === "group";

      // Hide private/stranger chats that do not have any messages
      if (!isGroupChat && !c.lastMessage) {
        return false;
      }

      // Handle archived vs active views
      const isChatArchived = c.archived || c.isArchived;
      if (viewArchived) {
        if (!isChatArchived) return false;
      } else {
        if (isChatArchived) return false;
      }

      // Filter chips handling
      if (activeFilter === "unread" && c.unreadCount === 0) return false;
      if (activeFilter === "pinned" && !(c.pinned || c.isPinned)) return false;
      if (activeFilter === "groups" && !isGroupChat) return false;

      const other = c.otherUser ?? c.participants?.find((p) => p.id !== user?.id);
      const displayName = isGroupChat
        ? (c.name ?? "Group Chat")
        : other?.name || other?.username || "Unknown User";
      return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Sort pinned to top
      const aPinned = a.pinned || a.isPinned ? 1 : 0;
      const bPinned = b.pinned || b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      // Then sort by timestamp
      const aTime = a.lastMessage?.timestamp || a.updatedAt || a.createdAt || "";
      const bTime = b.lastMessage?.timestamp || b.updatedAt || b.createdAt || "";
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    }),
    [conversations, viewArchived, activeFilter, searchQuery, user?.id]);

  const handleSelectConversation = (id: string) => {
    // Opened from the conversation list → Back should return to the list, so
    // clear any stale "return to other tab" marker.
    setChatReturnTab(null);
    setSelectedConversationId(id);
    setShowMobileSecondaryPanel(false);
  };

  const openContextMenu = useCallback((e: PointerEvent | MouseEvent, id: string) => {
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuTarget(id);
    setMenuOpen(true);
  }, []);

  const archivedChatsCount = conversations.filter((c) => c.archived || c.isArchived).length;

  return (
    <div className="flex flex-col bg-card border-r border-white/10 h-dvh w-full md:w-80 lg:w-96 md:fixed md:left-[72px] md:top-0">
      <AppLayout
        title={viewArchived ? "Archived" : "TalkMe"}
        logo={viewArchived ? undefined : "/apple-icon.png"}
        icon={viewArchived ? Archive : MessageCircle}
        searchPlaceholder="Search conversations"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filterChips={
          viewArchived
            ? undefined
            : [
                { id: "all", label: "All" },
                { id: "unread", label: "Unread" },
                { id: "pinned", label: "Pinned" },
                { id: "groups", label: "Groups" },
              ]
        }
        activeFilterId={activeFilter}
        onFilterChange={setActiveFilter}
        headerRight={
          viewArchived ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewArchived(false)}
              className="text-primary hover:text-primary-foreground font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Chats
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveTab("discover")}
                className="bg-primary text-primary-foreground h-9 w-9 rounded-full hover:bg-primary/80 dark:hover:bg-primary/80 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-muted-foreground cursor-pointer"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          )
        }
      >
        <div className="flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm text-muted-foreground">Loading chats...</p>
            </div>
          ) : (
            <div className="px-0 pb-24">
              {/* Archived entry — always available when archived chats exist,
                  even if the active list is empty */}
              {!viewArchived && !searchQuery && archivedChatsCount > 0 && (
                <div
                  className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-colors border-b border-border/40 dark:border-white/5"
                  onClick={() => setViewArchived(true)}
                >
                  <div className="flex items-center gap-4">
                    <Archive className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold text-foreground">Archived</span>
                  </div>
                  <span className="text-xs font-semibold text-primary">{archivedChatsCount}</span>
                </div>
              )}
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                  <p className="text-sm font-medium text-foreground">
                    {viewArchived ? "No archived chats" : "No chats found"}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversationId === conversation.id}
                    onSelect={() => handleSelectConversation(conversation.id)}
                    onContextMenu={openContextMenu}
                    currentUserId={user?.id}
                    isTyping={typingChats[conversation.id]}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </AppLayout>

      {/* Context Menu */}
      <ConversationContextMenu
        isOpen={menuOpen}
        isMobile={isMobile}
        position={menuPos}
        isUnread={(targetChat?.unreadCount ?? 0) > 0}
        isPinned={targetChat?.pinned || targetChat?.isPinned}
        isMuted={targetChat?.muted || targetChat?.isMuted}
        isArchived={targetChat?.archived || targetChat?.isArchived}
        onClose={() => setMenuOpen(false)}
        onMute={() => {
          if (menuTarget) {
            if (targetChat?.muted || targetChat?.isMuted) {
              unmuteMutation.mutate(menuTarget);
            } else {
              muteMutation.mutate({ chatId: menuTarget, payload: { duration: null } });
            }
          }
        }}
        onArchive={() => {
          if (menuTarget) {
            if (targetChat?.archived || targetChat?.isArchived) {
              unarchiveMutation.mutate(menuTarget);
            } else {
              archiveMutation.mutate(menuTarget);
            }
          }
        }}
        onPin={() => {
          if (menuTarget) {
            if (targetChat?.pinned || targetChat?.isPinned) {
              unpinMutation.mutate(menuTarget);
            } else {
              pinMutation.mutate(menuTarget);
            }
          }
        }}
        onDelete={() => {
          if (menuTarget) {
            deleteMutation.mutate(menuTarget);
          }
        }}
        onViewProfile={() => {
          if (targetChat && contactForModal) {
            setProfileModal({
              contact: contactForModal,
              userId: otherParticipant?.id,
            });
          }
        }}
        onBlock={() => {
          if (otherParticipant?.id) {
            blockUserMutation.mutate(otherParticipant.id);
          }
        }}
        onMarkReadToggle={() => {
          if (menuTarget) {
            if ((targetChat?.unreadCount ?? 0) > 0) {
              markReadMutation.mutate(menuTarget);
            } else {
              queryClient.setQueryData<any>(QUERY_KEYS.CHATS.LIST, (old: any) => {
                if (!Array.isArray(old)) return old;
                return old.map((c: any) => (c.id === menuTarget ? { ...c, unreadCount: 1 } : c));
              });
            }
          }
        }}
      />
    </div>
  );
}
