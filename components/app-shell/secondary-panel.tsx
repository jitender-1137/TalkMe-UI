"use client";

import { useState, useCallback, useEffect, useMemo, memo } from "react";
import {
  Search,
  MoreHorizontal,
  Plus,
  Pin,
  BellOff,
  ChevronLeft,
  Archive,
  MessageCircle,
  Users,
} from "lucide-react";
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
import { useContactRequests } from "@/src/api/hooks/useContacts";
import { FriendsOverlay } from "@/components/friends";
import type { Chat } from "@/src/api/types";
import { useWebSocket } from "@/components/providers";
import { useNavigation } from "./navigation-context";
import {
  HEADER_ICON_BTN,
  HEADER_ICON_BTN_ACTIVE,
  HEADER_ICON,
} from "@/components/ui/header-button";

/** Messaging-themed backdrop for the Chats header: a flowing conversation of
 *  speech bubbles, a reaction heart and drifting sparkles. */
function ChatsBackdrop() {
  return (
    <svg
      viewBox="0 0 900 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
    >
      <defs>
        <radialGradient id="chats-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.8 0.2 165)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="oklch(0.8 0.2 165)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="chats-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.82 0.16 165)" stopOpacity="0.2" />
          <stop offset="60%" stopColor="oklch(0.85 0.17 165)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="oklch(0.75 0.16 185)" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <ellipse cx="690" cy="80" rx="240" ry="110" fill="url(#chats-glow)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="5s" repeatCount="indefinite" />
      </ellipse>

      {/* dotted "conversation thread" — dashes flow along the path */}
      <path
        d="M470 150 C 560 110, 540 60, 620 60 S 760 110, 845 120"
        fill="none"
        stroke="oklch(0.82 0.16 165)"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeDasharray="2 7"
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="36;0"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>

      {/* main incoming bubble + tail (gentle float) */}
      <g fill="none" stroke="url(#chats-stroke)">
        <path
          d="M548 38 h150 a18 18 0 0 1 18 18 v40 a18 18 0 0 1 -18 18 h-92 l-22 20 v-20 h-36 a18 18 0 0 1 -18 -18 v-40 a18 18 0 0 1 18 -18 z"
          strokeWidth="2"
        />
        {/* typing dots in the main bubble */}
        {[600, 628, 656].map((cx, i) => (
          <circle key={cx} cx={cx} cy="76" r="4" fill="oklch(0.86 0.16 165)" stroke="none">
            <animate
              attributeName="opacity"
              values="0.35;1;0.35"
              dur="1.4s"
              begin={`${i * 0.2}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -5; 0 0"
          dur="4s"
          repeatCount="indefinite"
        />
      </g>

      {/* outgoing reply bubble (floats out of phase) */}
      <g fill="none" stroke="url(#chats-stroke)">
        <path
          d="M770 104 h66 a14 14 0 0 1 14 14 v26 a14 14 0 0 1 -14 14 h-10 l-16 16 v-16 h-40 a14 14 0 0 1 -14 -14 v-26 a14 14 0 0 1 14 -14 z"
          strokeWidth="1.6"
          strokeOpacity="0.6"
        />
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 5; 0 0"
          dur="4.6s"
          repeatCount="indefinite"
        />
      </g>

      {/* tiny far bubble */}
      <path
        d="M455 96 h44 a12 12 0 0 1 12 12 v18 a12 12 0 0 1 -12 12 h-30 l-12 12 v-12 h-2 a12 12 0 0 1 -12 -12 v-18 a12 12 0 0 1 12 -12 z"
        fill="none"
        stroke="url(#chats-stroke)"
        strokeWidth="1.2"
        strokeOpacity="0.4"
      >
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -3; 0 0"
          dur="3.4s"
          repeatCount="indefinite"
        />
      </path>

      {/* reaction heart (beats by fading + bobbing) */}
      <path
        d="M812 70 c -4 -8 -16 -6 -16 3 c 0 7 9 12 16 18 c 7 -6 16 -11 16 -18 c 0 -9 -12 -11 -16 -3 z"
        fill="oklch(0.72 0.2 20)"
        fillOpacity="0.7"
      >
        <animate
          attributeName="fill-opacity"
          values="0.45;0.85;0.45"
          dur="1.6s"
          repeatCount="indefinite"
        />
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -6; 0 0"
          dur="3.2s"
          repeatCount="indefinite"
        />
      </path>

      {/* message "packets" travelling along the conversation thread */}
      {[0, 1, 2].map((i) => (
        <circle key={`pkt-${i}`} r={i === 1 ? 3 : 2.4} fill="oklch(0.9 0.14 165)">
          <animateMotion
            path="M470 150 C 560 110, 540 60, 620 60 S 760 110, 845 120"
            dur="3.4s"
            begin={`${i * 1.1}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.12;0.85;1"
            dur="3.4s"
            begin={`${i * 1.1}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* rising stream of chat bubbles (float up + fade) */}
      {[
        [462, 16, 8, 0],
        [524, 11, 6.4, 1.6],
        [604, 19, 9, 0.7],
        [676, 12, 6.8, 2.4],
        [752, 15, 7.6, 0.3],
        [834, 10, 6, 3.1],
        [704, 13, 8.4, 1.1],
      ].map(([x, s, dur, begin], i) => (
        <g key={`rise-${i}`}>
          <rect
            x={x}
            y={172}
            width={s * 1.7}
            height={s}
            rx={s / 2}
            fill="oklch(0.8 0.14 165)"
            fillOpacity="0.18"
            stroke="oklch(0.85 0.16 165)"
            strokeOpacity="0.5"
            strokeWidth="1"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 0 -160"
            dur={`${dur}s`}
            begin={`${begin}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;0.9;0.9;0"
            keyTimes="0;0.15;0.7;1"
            dur={`${dur}s`}
            begin={`${begin}s`}
            repeatCount="indefinite"
          />
        </g>
      ))}

      {/* floating reactions (hearts + a thumbs-up) drifting up */}
      {[
        ["heart", 600, 150, 5.5, 0.5],
        ["heart", 860, 150, 6.2, 2.2],
        ["up", 510, 160, 6, 3.4],
      ].map(([kind, x, y, dur, begin], i) => (
        <g key={`react-${i}`}>
          {kind === "heart" ? (
            <path
              d={`M${x} ${y} c -3 -6 -12 -4 -12 2 c 0 5 7 9 12 13 c 5 -4 12 -8 12 -13 c 0 -6 -9 -8 -12 -2 z`}
              fill="oklch(0.72 0.2 20)"
            />
          ) : (
            <path
              d={`M${x as number} ${(y as number) - 4} v8 h-4 v-8 z M${x as number} ${(y as number) - 4} h8 v10 h-8 z`}
              fill="oklch(0.8 0.16 165)"
            />
          )}
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 6 -70; -4 -130"
            keyTimes="0;0.5;1"
            dur={`${dur}s`}
            begin={`${begin}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;0.85;0"
            keyTimes="0;0.3;1"
            dur={`${dur}s`}
            begin={`${begin}s`}
            repeatCount="indefinite"
          />
        </g>
      ))}

      {/* drifting, twinkling sparkles */}
      {[
        [520, 50, 1.4],
        [740, 46, 1.2],
        [690, 150, 1.3],
        [880, 70, 1],
        [600, 30, 1],
      ].map(([x, y, r], i) => (
        <circle key={`spk-${i}`} cx={x} cy={y} r={r} fill="oklch(0.92 0.06 165)" fillOpacity="0.85">
          <animate
            attributeName="opacity"
            values="0.3;1;0.3"
            dur={`${2.5 + (i % 3)}s`}
            begin={`${i * 0.4}s`}
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 0 -6; 0 0"
            dur={`${5 + i}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* rotating 4-point sparkles */}
      {[
        [560, 40],
        [800, 150],
      ].map(([x, y], i) => (
        <path
          key={`star-${i}`}
          d={`M${x} ${(y as number) - 7} l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z`}
          fill="oklch(0.94 0.06 165)"
          fillOpacity="0.8"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${x} ${y}`}
            to={`360 ${x} ${y}`}
            dur={`${7 + i * 2}s`}
            repeatCount="indefinite"
          />
        </path>
      ))}
    </svg>
  );
}

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
    const pa = a![i] as {
      id?: string;
      name?: string;
      username?: string;
      avatar?: string | null;
      presence?: string;
      gender?: string | null;
    };
    const pb = b![i] as {
      id?: string;
      name?: string;
      username?: string;
      avatar?: string | null;
      presence?: string;
      gender?: string | null;
    };
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
    !!lastMsg &&
    !isGroup &&
    !lastMsg.isDeleted &&
    lastMsg.senderId === currentUserId &&
    !!lastMsg.status;

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
          <span
            className={cn(
              "font-semibold text-sm truncate",
              // Tint female 1:1 contacts' names light pink — same as discover & lobby.
              !isGroup && otherParticipant?.gender?.toUpperCase() === "FEMALE"
                ? "text-pink-300"
                : "text-foreground",
            )}
          >
            {displayName}
          </span>
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTarget, setMenuTarget] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [viewArchived, setViewArchived] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { registerHandler } = useWebSocket();
  const [typingChats, setTypingChats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const cleanupStarted = registerHandler("typing_started", (payload: any) => {
      const isSelf = payload.userId === user?.id;
      console.log("[TYPING UI] SecondaryPanel received typing_started event:", {
        currentLoggedInUserId: user?.id,
        chatId: payload.chatId,
        senderId: payload.userId,
        ignored: isSelf ? "YES" : "NO",
        reason: isSelf ? "Self typing event" : "None",
      });
      if (payload.chatId && !isSelf) {
        setTypingChats((prev) => ({ ...prev, [payload.chatId]: true }));
      }
    });

    const cleanupStopped = registerHandler("typing_stopped", (payload: any) => {
      const isSelf = payload.userId === user?.id;
      console.log("[TYPING UI] SecondaryPanel received typing_stopped event:", {
        currentLoggedInUserId: user?.id,
        chatId: payload.chatId,
        senderId: payload.userId,
        ignored: isSelf ? "YES" : "NO",
        reason: isSelf ? "Self typing event" : "None",
      });
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
  const { data: contactRequests = [] } = useContactRequests();
  const pendingRequestsCount = contactRequests.length;
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

  const filteredConversations = useMemo(
    () =>
      conversations
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
    [conversations, viewArchived, activeFilter, searchQuery, user?.id],
  );

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

  // Counts shown on the filter chips (over the active, non-archived chat set).
  const filterCounts = useMemo(() => {
    const base = conversations.filter((c) => {
      const isGroupChat = c.chatType === "GROUP" || c.type === "group";
      if (!isGroupChat && !c.lastMessage) return false;
      return !(c.archived || c.isArchived);
    });
    return {
      all: base.length,
      unread: base.filter((c) => (c.unreadCount ?? 0) > 0).length,
      pinned: base.filter((c) => c.pinned || c.isPinned).length,
      groups: base.filter((c) => c.chatType === "GROUP" || c.type === "group").length,
    };
  }, [conversations]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="flex flex-col bg-card border-r border-white/10 h-dvh w-full md:w-80 lg:w-96 md:fixed md:left-[72px] md:top-0">
      <AppLayout
        title={viewArchived ? "Archived" : "TalkMe"}
        icon={viewArchived ? Archive : MessageCircle}
        logoNode={
          viewArchived ? undefined : (
            <div className="relative h-14 w-14 shrink-0">
              <span className="absolute inset-0 rounded-2xl bg-primary/30 blur-md" />
              <span className="absolute -inset-1 rounded-[18px] border border-primary/30" />
              <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-primary/40 shadow-lg shadow-primary/25">
                <img src="/apple-icon.png" alt="TalkMe" className="h-full w-full object-cover" />
              </div>
            </div>
          )
        }
        subtitle={viewArchived ? undefined : "Your conversations, all in one place"}
        headerBackdrop={viewArchived ? undefined : <ChatsBackdrop />}
        disableCollapse
        scrollKey="tab:chats"
        searchPlaceholder="Search conversations"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        showSearchBar={searchOpen}
        searchAutoFocus
        filterChips={
          viewArchived
            ? undefined
            : [
                { id: "all", label: "All" },
                { id: "unread", label: "Unread", badge: filterCounts.unread },
                { id: "pinned", label: "Pinned", badge: filterCounts.pinned },
                { id: "groups", label: "Groups", badge: filterCounts.groups },
              ]
        }
        activeFilterId={activeFilter}
        onFilterChange={setActiveFilter}
        headerRight={
          viewArchived ? (
            <button
              onClick={() => setViewArchived(false)}
              aria-label="Back to Chats"
              className={cn(HEADER_ICON_BTN, "w-auto gap-1 px-3 text-sm font-semibold")}
            >
              <ChevronLeft className="h-4 w-4" />
              Chats
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFriendsOpen(true)}
                aria-label="Friends"
                className={cn(HEADER_ICON_BTN, "relative")}
              >
                <Users className={HEADER_ICON} />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none px-1 ring-2 ring-card">
                    {pendingRequestsCount > 99 ? "99+" : pendingRequestsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
                aria-label="Search"
                className={cn(HEADER_ICON_BTN, searchOpen && HEADER_ICON_BTN_ACTIVE)}
              >
                <Search className={HEADER_ICON} />
              </button>
              <button
                onClick={() => setActiveTab("discover")}
                aria-label="New chat"
                className={HEADER_ICON_BTN}
              >
                <Plus className={HEADER_ICON} />
              </button>
              {/* <button aria-label="More options" className={HEADER_ICON_BTN}>
                <MoreHorizontal className={HEADER_ICON} />
              </button> */}
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

      {/* Friends — nested overlay (#chats/friends), Back returns to Chats */}
      <FriendsOverlay open={friendsOpen} onClose={() => setFriendsOpen(false)} />
    </div>
  );
}
