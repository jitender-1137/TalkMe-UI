"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, MoreVertical, Plus, Pin, BellOff, ChevronLeft, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarStatusBadge } from "@/components/presence";
import { ConversationContextMenu } from "@/components/chat/conversation-context-menu";
import { UserProfileModal } from "@/components/chat/user-profile-modal";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/src/api/query-keys";
import type { ChatContact } from "@/components/chat/types";
import { cn } from "@/lib/utils";
import { useChatContext } from "@/components/chat/chat-context";
import { useLongPress } from "@/hooks/use-long-press";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "./auth-context";
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

function ConversationItem({
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
    : (otherParticipant?.name || otherParticipant?.username || "Unknown User");
  const displayStatus = isGroup ? "online" : (otherParticipant?.presence ?? "offline");
  const lastMessageText = conversation.lastMessage
    ? conversation.lastMessage.isDeleted
      ? "This message was deleted"
      : conversation.lastMessage.content
    : "No messages yet";
  const lastMessageTime = conversation.lastMessage
    ? formatRelativeTime(conversation.lastMessage.timestamp)
    : formatRelativeTime(conversation.updatedAt);

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
        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left cursor-pointer select-none border-b border-border",
        isSelected ? "bg-primary/12" : "hover:bg-white/5 active:bg-white/10 active:scale-[0.98]",
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
          <span className="font-medium text-sm text-foreground truncate">{displayName}</span>
          <span className="text-xs text-muted-foreground shrink-0">{lastMessageTime}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {isTyping ? (
            <p className="text-sm text-emerald-500 font-medium animate-pulse truncate">typing...</p>
          ) : (
            <p className="text-sm text-muted-foreground truncate">{lastMessageText}</p>
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
}

export function SecondaryPanel() {
  const { user } = useAuth();
  const { selectedConversationId, setSelectedConversationId, setShowMobileSecondaryPanel } =
    useChatContext();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTarget, setMenuTarget] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewArchived, setViewArchived] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const queryClient = useQueryClient();

  const { registerHandler } = useWebSocket();
  const [typingChats, setTypingChats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const cleanupStarted = registerHandler("typing_started", (payload: any) => {
      if (payload.chatId) {
        setTypingChats((prev) => ({ ...prev, [payload.chatId]: true }));
      }
    });

    const cleanupStopped = registerHandler("typing_stopped", (payload: any) => {
      if (payload.chatId) {
        setTypingChats((prev) => ({ ...prev, [payload.chatId]: false }));
      }
    });

    return () => {
      cleanupStarted();
      cleanupStopped();
    };
  }, [registerHandler]);

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
      : (otherParticipant?.name || otherParticipant?.username || "Unknown User")
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

  const filteredConversations = conversations
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

      const other = c.otherUser ?? c.participants?.find((p) => p.id !== user?.id);
      const displayName = isGroupChat ? (c.name ?? "Group Chat") : (other?.name || other?.username || "Unknown User");
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
    });

  const handleSelectConversation = (id: string) => {
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
    <div className="flex flex-col bg-card border-r border-white/10 h-dvh md:w-80 lg:w-96 md:fixed md:left-[72px] md:top-0 pb-20 md:pb-0">
      {/* App Branding Header - Mobile Only */}
      {!viewArchived && (
        <div className="md:hidden sticky top-0 z-20 bg-card">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25">
              T
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground tracking-tight">TalkMe</h1>
              <p className="text-xs text-muted-foreground">Connect. Chat. Share.</p>
            </div>
          </div>
        </div>
      )}

      {/* Chats Header */}
      <div className="sticky top-0 md:top-0 z-10 flex items-center justify-between px-4 h-16 bg-card border-b border-border/50">
        {viewArchived ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewArchived(false)}
              className="h-10 w-10 rounded-full hover:bg-white/10 active:scale-95 -ml-2"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl font-bold text-foreground">Archived</h2>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground">Chats</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-white/10 active:scale-95 transition-all"
              >
                <Plus className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-white/10 active:scale-95 transition-all"
              >
                <MoreVertical className="h-6 w-6" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Search */}
      <div className="sticky top-16 z-10 px-4 py-3 bg-card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search conversations"
            className="pl-12 bg-muted/60 border-white/10 h-11 rounded-full focus:bg-muted transition-colors placeholder:text-muted-foreground text-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation List - Scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-muted-foreground">Loading chats...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <p className="text-sm font-medium text-foreground">
              {viewArchived ? "No archived chats" : "No chats found"}
            </p>
          </div>
        ) : (
          <div className="px-0 py-0">
            {!viewArchived && !searchQuery && archivedChatsCount > 0 && (
              <div
                className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors border-b border-border/50"
                onClick={() => setViewArchived(true)}
              >
                <div className="flex items-center gap-4">
                  <Archive className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Archived</span>
                </div>
                <span className="text-xs font-semibold text-primary">{archivedChatsCount}</span>
              </div>
            )}
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation.id}
                onSelect={() => handleSelectConversation(conversation.id)}
                onContextMenu={openContextMenu}
                currentUserId={user?.id}
                isTyping={typingChats[conversation.id]}
              />
            ))}
          </div>
        )}
      </div>

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
          if (targetChat) {
            setShowProfileModal(true);
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

      {/* Profile Modal */}
      {contactForModal && (
        <UserProfileModal
          contact={contactForModal}
          userId={otherParticipant?.id}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          isOwnProfile={false}
        />
      )}
    </div>
  );
}
