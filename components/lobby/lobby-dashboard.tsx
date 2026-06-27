"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { MessageSquare, Users, ArrowLeft, X, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLobbyStore } from "./lobby-store";
import { useOnlineUsers, useInbox, useChat, usePresence } from "./hooks";
import { useProfile, useLobbyUsers } from "@/src/api/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/src/api/query-keys";
import { useWebSocket } from "@/components/providers/websocket-provider";
import { useAuth } from "@/components/app-shell/auth-context";
import { MessageInput } from "@/components/chat/message-input";
import { UploadService } from "@/src/api/services/upload.service";
import { toast } from "sonner";
import { MessageMedia } from "@/components/chat/message-media";
import { MessageStatusIcon } from "@/components/chat/message-status";
import { BubbleBody, BubbleShell } from "@/components/chat/bubble-body";
import type { MediaAttachment } from "@/components/chat/types";
import type { ChatUser } from "./types";
import { useScrollRestore } from "@/lib/navigation/scroll-restore";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisualViewport } from "@/hooks/use-visual-viewport";

// Helper to detect if a message content is a media URL (GIF/sticker)
const isMediaUrl = (content: string) => {
  if (!content) return false;
  const trimmed = content.trim();
  const isUrl =
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/api/") ||
    trimmed.startsWith("/uploads/");
  return (
    isUrl &&
    (trimmed.match(/\.(gif|png|jpg|jpeg|webp|svg)(\?.*)?$/i) ||
      trimmed.includes("giphy.com") ||
      trimmed.includes("dicebear.com") ||
      trimmed.includes("robohash.org") ||
      (trimmed.includes("/uploads/media") &&
        (trimmed.includes(".gif") ||
          trimmed.includes(".png") ||
          trimmed.includes(".jpg") ||
          trimmed.includes(".jpeg") ||
          trimmed.includes(".webp") ||
          trimmed.includes(".svg"))))
  );
};

const isAudioUrl = (content: string) => {
  if (!content) return false;
  const trimmed = content.trim();
  const isUrl =
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/api/") ||
    trimmed.startsWith("/uploads/");
  return (
    isUrl &&
    (trimmed.match(/\.(webm|mp3|wav|ogg|m4a)(\?.*)?$/i) ||
      trimmed.includes("/uploads/voice-message-") ||
      trimmed.includes("/uploads/audio-") ||
      (trimmed.includes("/uploads/media") &&
        (trimmed.includes(".webm") ||
          trimmed.includes(".mp3") ||
          trimmed.includes(".wav") ||
          trimmed.includes(".ogg") ||
          trimmed.includes(".m4a"))))
  );
};

export function LobbyDashboard() {
  const { data: ownProfile } = useProfile();
  const { guestUser, isGuestMatch, isAuthenticated, logout, openLoginModal } = useAuth();
  const myUsername = ownProfile?.username || (isGuestMatch && guestUser?.name) || "Guest";
  const { registerHandler } = useWebSocket();
  const { joinLobby, leaveLobby, isConnected } = usePresence();

  // Zustand State
  const activeTab = useLobbyStore((state) => state.activeTab);
  const setActiveTab = useLobbyStore((state) => state.setActiveTab);

  // The online-users list and the inbox list share one container but must keep
  // independent scroll positions, so the restore key tracks the active list.
  const listScrollRef = useRef<HTMLDivElement>(null);
  useScrollRestore(listScrollRef, `lobby:${activeTab}`);

  const genderFilter = useLobbyStore((state) => state.genderFilter);
  const setGenderFilter = useLobbyStore((state) => state.setGenderFilter);

  const selectedUser = useLobbyStore((state) => state.selectedUser);
  const setSelectedUser = useLobbyStore((state) => state.setSelectedUser);

  const addMessage = useLobbyStore((state) => state.addMessage);
  const setTyping = useLobbyStore((state) => state.setTyping);
  const setUserOnlineStatus = useLobbyStore((state) => state.setUserOnlineStatus);
  const blockedUsers = useLobbyStore((state) => state.blockedUsers);
  const blockUser = useLobbyStore((state) => state.blockUser);

  // Hooks
  const { onlineUsers, isLoading: isUsersLoading, refetch } = useOnlineUsers();
  const { conversations, unreadCount: inboxUnreadCount, deleteConversation } = useInbox();

  // Connect to STOMP and register lobby handlers
  useEffect(() => {
    if (isConnected) {
      joinLobby();
    }

    const unbindTyping = registerHandler("lobby_typing", (payload) => {
      // payload: { sender, recipient, isTyping }
      setTyping((payload as any).sender, (payload as any).isTyping);
    });

    const unbindJoin = registerHandler("lobby_joined", (user) => {
      setUserOnlineStatus((user as any).username, true);
    });

    const unbindLeave = registerHandler("lobby_left", (username) => {
      setUserOnlineStatus(username as string, false);
    });

    return () => {
      leaveLobby();
      unbindTyping();
      unbindJoin();
      unbindLeave();
      setSelectedUser(null);
    };
  }, [
    isConnected,
    joinLobby,
    leaveLobby,
    registerHandler,
    setTyping,
    setUserOnlineStatus,
    setSelectedUser,
  ]);

  // Mobile navigation helper
  const handleSelectUser = (user: ChatUser) => {
    setSelectedUser(user);
  };

  const handleCloseChat = () => {
    // The chat is registered as a URL overlay (#match/lobby/chat) in
    // ConnectDashboard. Clearing selectedUser flips that overlay closed, which
    // consumes its history entry via history.back() — so the in-app back button
    // and the OS Back button land on the same #match/lobby entry, with the lobby
    // list (still mounted) keeping its scroll position.
    setSelectedUser(null);
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground relative",
        selectedUser
          ? "h-full min-h-0 overflow-hidden"
          : "h-auto md:h-full md:overflow-hidden overflow-visible",
      )}
    >
      {/* Main Layout Container */}
      <div
        className={cn(
          "flex-1 min-h-0 flex md:overflow-hidden",
          selectedUser ? "overflow-hidden" : "overflow-visible",
        )}
      >
        {/* LEFT COLUMN: User list and Inbox */}
        <div
          className={cn(
            "w-full md:w-87.5 lg:w-100 shrink-0 flex flex-col border-r border-border bg-background transition-all duration-300",
            selectedUser ? "hidden md:flex" : "flex",
          )}
        >
          {/* Header Card */}
          {/* <div className="p-4 bg-card border-b border-border shrink-0 md:static sticky top-[calc(env(safe-area-inset-top)+56px)] z-20">
            <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
              Talk with Strangers
            </h1>
          </div> */}

          {/* Statistics Tabs */}
          <div className="grid grid-cols-2 p-2 gap-2 bg-card border-b border-border shrink-0 md:static sticky top-[calc(env(safe-area-inset-top)+112px)] z-20">
            <button
              onClick={() => setActiveTab("lobby")}
              className={cn(
                "py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-98 select-none",
                activeTab === "lobby"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <Users className="w-4 h-4" />
              <span>{onlineUsers.length} Online</span>
            </button>

            <button
              onClick={() => setActiveTab("inbox")}
              className={cn(
                "py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-98 select-none relative",
                activeTab === "inbox"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Inbox</span>
              {inboxUnreadCount > 0 && (
                <span className="rounded-full min-w-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {inboxUnreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Bar (Lobby view only) */}
          {activeTab === "lobby" && (
            <div className="d-flex justify-center py-0.5 bg-background shrink-0 flex items-center gap-0.5 overflow-x-auto select-none no-scrollbar md:static sticky top-[calc(env(safe-area-inset-top)+168px)] z-20">
              <button
                onClick={() => setGenderFilter("all")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
                  genderFilter === "all"
                    ? "bg-primary text-background"
                    : "bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                All
              </button>
              <button
                onClick={() => setGenderFilter("female")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
                  genderFilter === "female"
                    ? "bg-primary text-background"
                    : "bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                Female
              </button>
              <button
                onClick={() => setGenderFilter("male")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0",
                  genderFilter === "male"
                    ? "bg-primary text-background"
                    : "bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                Male
              </button>
            </div>
          )}

          {/* Scrollable Container (User List or Inbox list) */}
          <div
            ref={listScrollRef}
            className="flex-1 md:overflow-y-auto overflow-visible custom-scrollbar p-3 space-y-2"
          >
            {activeTab === "lobby" ? (
              isUsersLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Finding online strangers...</span>
                </div>
              ) : onlineUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center px-4">
                  <span className="text-3xl mb-2">📡</span>
                  <p className="text-sm font-semibold">No strangers online</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try switching filters or check back later
                  </p>
                </div>
              ) : (
                onlineUsers.map((user, idx) => (
                  <div
                    key={user.id || user.username || user.name || `user-${idx}`}
                    onClick={() => handleSelectUser(user)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all cursor-pointer select-none",
                      (selectedUser?.username || selectedUser?.name) ===
                        (user.username || user.name)
                        ? "bg-primary/12 border-border"
                        : "bg-card hover:bg-card/80",
                    )}
                  >
                    <Avatar className="w-10 h-10 border border-border shrink-0">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                        {(user.name || user.username || "Guest").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "font-semibold text-sm truncate",
                            user.gender?.toUpperCase() === "FEMALE"
                              ? "text-pink-300"
                              : "text-foreground",
                          )}
                        >
                          {user.name || user.username || "Guest"}
                        </span>
                        <span
                          className={cn(
                            "text-xs shrink-0",
                            user.gender?.toUpperCase() === "FEMALE"
                              ? "text-pink-300/80 font-medium"
                              : "text-muted-foreground",
                          )}
                        >
                          {user.age} yrs
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <span className="text-sm shrink-0 leading-none">
                          {user.countryFlag || "🌐"}
                        </span>
                        <span>{user.country || "Global"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : /* INBOX VIEW */
            conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center px-4">
                <span className="text-3xl mb-2">💬</span>
                <p className="text-sm font-semibold">Your inbox is empty</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start messaging online users to see chats here
                </p>
              </div>
            ) : (
              conversations.map((conv, idx) => (
                <div
                  key={conv.id || conv.user?.username || conv.user?.name || `conv-${idx}`}
                  onClick={() => handleSelectUser(conv.user)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all cursor-pointer select-none relative group",
                    (selectedUser?.username || selectedUser?.name) ===
                      (conv.user?.username || conv.user?.name)
                      ? "bg-primary/12 border-border"
                      : "bg-card hover:bg-card/80",
                  )}
                >
                  <Avatar className="w-10 h-10 border border-border shrink-0">
                    <AvatarImage src={conv.user?.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                      {(conv.user?.name || conv.user?.username || "Guest")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "font-semibold text-sm truncate mr-2",
                          conv.user?.gender?.toUpperCase() === "FEMALE"
                            ? "text-pink-300"
                            : "text-foreground",
                        )}
                      >
                        {conv.user?.name || conv.user?.username || "Guest"}
                      </span>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xl leading-none">
                          {conv.user?.countryFlag || "🌐"}
                        </span>
                        {/* Delete button (❌) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.user?.username || conv.user?.name || "");
                          }}
                          className="p-1 bg-destructive/20 text-destructive hover:text-destructive-foreground hover:bg-destructive/30 rounded-lg transition-all border border-destructive/30 shrink-0"
                          title="Delete Conversation"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate pr-2">
                        {conv.lastMessage}
                      </p>
                      {conv.unreadCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-pink-500 text-white text-[9px] font-bold shrink-0">
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}{" "}
                          {conv.unreadCount === 1 ? "Message" : "Messages"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(conv.lastTimestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Private Chat (or placeholder on desktop) */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-background",
            selectedUser
              ? "flex"
              : "hidden md:flex items-center justify-center p-6 text-center text-muted-foreground",
          )}
        >
          {selectedUser ? (
            <PrivateChatPanel user={selectedUser} onBack={handleCloseChat} />
          ) : (
            <div className="space-y-4 max-w-sm select-none">
              <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center text-4xl mx-auto border border-border">
                💬
              </div>
              <h2 className="text-lg font-bold text-foreground">Private Chat Area</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select a stranger from the list to start a transient chat. Lobby chats are local,
                private, and end when you clear data or leave.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PRIVATE CHAT PANEL COMPONENT ──────────────────────────────────────────────
interface PrivateChatPanelProps {
  user: ChatUser;
  onBack: () => void;
}

function PrivateChatPanel({ user, onBack }: PrivateChatPanelProps) {
  const queryClient = useQueryClient();
  const { data: ownProfile } = useProfile();
  const { guestUser, isGuestMatch } = useAuth();
  const myUsername = ownProfile?.username || (isGuestMatch && guestUser?.name) || "Guest";
  const partnerUsername = user.username || user.name || "Guest";

  // Mobile keyboard handling — match the main chat-area: on mobile the panel becomes
  // a fixed overlay glued to the visual viewport, so opening the keyboard keeps the
  // header pinned and slides the conversation up above the keyboard.
  const isMobile = useIsMobile();
  const { height: vvHeight, offsetTop: vvTop } = useVisualViewport();
  const { messages, sendMessage, sendTypingStatus, isPartnerTyping } = useChat(partnerUsername);
  const blockUser = useLobbyStore((state) => state.blockUser);
  const isBlocked = useLobbyStore((state) => state.blockedUsers.includes(partnerUsername));

  const { data: lobbyUsers = [] } = useLobbyUsers();
  const activeConnections = useLobbyStore((state) => state.activeConnections);

  const onlineUsernames = React.useMemo(() => {
    const list =
      lobbyUsers.length > 0
        ? lobbyUsers
        : queryClient.getQueryData<any[]>(QUERY_KEYS.PRESENCE.LOBBY) || [];
    return new Set(list.map((u: any) => u.username || u.name || ""));
  }, [lobbyUsers, queryClient]);

  const isPartnerOnline = (() => {
    if (activeConnections[partnerUsername] === false) return false;
    if (activeConnections[partnerUsername] === true) return true;
    return onlineUsernames.has(partnerUsername);
  })();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastPartnerRef = useRef(partnerUsername);

  // Scroll to bottom on load / message updates
  useEffect(() => {
    const isNewPartner = lastPartnerRef.current !== partnerUsername;
    lastPartnerRef.current = partnerUsername;

    if (isNewPartner) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
      return () => clearTimeout(timer);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isPartnerTyping, partnerUsername]);

  // Typing handler for MessageInput
  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (isPartnerOnline) {
        sendTypingStatus(isTyping);
      }
    },
    [isPartnerOnline, sendTypingStatus],
  );

  // Handle send from MessageInput
  const handleSend = useCallback(
    (content: string) => {
      if (!content.trim()) return;
      sendMessage(content.trim());
    },
    [sendMessage],
  );

  // Handle GIF/sticker send - send URL as message content
  const handleSendMediaDirectly = useCallback(
    (url: string, _type: "image" | "sticker") => {
      sendMessage(url);
    },
    [sendMessage],
  );

  const handleSendAudio = useCallback(
    async (file: File) => {
      try {
        const res = await UploadService.uploadFile(file, "audio", "lobby", () => {});
        sendMessage(res.url);
      } catch (err) {
        toast.error("Failed to send audio message");
      }
    },
    [sendMessage],
  );

  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-muted overflow-hidden",
        isMobile ? "fixed inset-x-0 top-0 z-[60]" : "relative flex-1 min-h-0 h-full",
      )}
      style={isMobile ? { height: vvHeight, top: vvTop } : undefined}
    >
      {/* Chat Header */}
      <header className="flex items-center justify-between p-2 md:p-4 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          {/* Back button (Desktop & Mobile) */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="w-9 h-9 rounded-xl hover:bg-muted text-foreground active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <Avatar className="w-10 h-10 border border-border shrink-0">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
              {(user.name || user.username || "Guest").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h2
              className={cn(
                "font-semibold text-sm leading-tight flex items-center gap-2",
                user.gender?.toUpperCase() === "FEMALE" ? "text-pink-300" : "text-foreground",
              )}
            >
              {user.name || user.username || "Guest"}
              <span
                className={cn(
                  "text-[10px]",
                  user.gender?.toUpperCase() === "FEMALE"
                    ? "text-pink-300/80 font-medium"
                    : "text-muted-foreground",
                )}
              >
                ({user.age})
              </span>
            </h2>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
              {isPartnerOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>
                    Online | {user.countryFlag || "🌐"} {user.country || "Global"}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                  <span>
                    Offline | {user.countryFlag || "🌐"} {user.country || "Global"}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-2">
          {isBlocked ? (
            <span className="text-xs text-destructive font-semibold px-2 py-1 bg-destructive/10 rounded-lg border border-destructive/20">
              Blocked
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const partnerName = user.username || user.name || "Guest";
                if (confirm(`Are you sure you want to block @${partnerName}?`)) {
                  blockUser(partnerName);
                  onBack();
                }
              }}
              className="h-8 border-border hover:bg-destructive/10 text-xs hover:text-destructive text-muted-foreground"
            >
              Block
            </Button>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-background">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-xs mx-auto space-y-3 select-none text-muted-foreground">
            <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-2xl">
              👋
            </div>
            <h4 className="text-sm font-bold text-foreground">Start the conversation!</h4>
            <p className="text-xs text-muted-foreground leading-normal">
              Say hello to {user.name || user.username || "Guest"}. Chat messages are encrypted,
              local-only, and disappear when deleted.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => {
              const isOwn = msg.senderId === myUsername;

              return (
                <div
                  key={msg.id || `msg-${idx}`}
                  className={cn("flex w-full", isOwn ? "justify-end" : "justify-start")}
                >
                  {isAudioUrl(msg.content) ? (
                    <BubbleShell isSent={isOwn} className="max-w-[300px] group">
                      <MessageMedia
                        media={{
                          type: "audio",
                          url: msg.content,
                          fileName: "voice-message.webm",
                        }}
                        isSent={isOwn}
                        chatId="lobby"
                        messageId={msg.id}
                      />
                      <BubbleBody
                        time={formatMessageTime(msg.timestamp || new Date(msg.createdAt).getTime())}
                        hasMedia
                        timeClassName={
                          isOwn ? "text-primary-foreground/65" : "text-muted-foreground"
                        }
                        statusNode={
                          isOwn ? (
                            <MessageStatusIcon status={msg.read ? "seen" : "sent"} />
                          ) : undefined
                        }
                      />
                    </BubbleShell>
                  ) : isMediaUrl(msg.content) ? (
                    <div className="relative">
                      <img
                        src={msg.content}
                        alt="Media"
                        className="max-w-[220px] max-h-[220px] rounded-2xl object-contain bg-transparent"
                        loading="lazy"
                      />
                      <div
                        className={cn(
                          "absolute bottom-1 right-2 px-2 py-0.5 rounded-full text-[9px] backdrop-blur-sm",
                          isOwn ? "bg-black/30 text-white" : "bg-black/20 text-white",
                        )}
                      >
                        {formatMessageTime(msg.timestamp || new Date(msg.createdAt).getTime())}
                        {isOwn && <span className="ml-1">{msg.read ? "✓✓" : "✓"}</span>}
                      </div>
                    </div>
                  ) : (
                    <BubbleShell isSent={isOwn} className="max-w-[75%] select-text">
                      <BubbleBody
                        content={msg.content}
                        time={formatMessageTime(msg.timestamp || new Date(msg.createdAt).getTime())}
                        timeClassName={
                          isOwn ? "text-primary-foreground/65" : "text-muted-foreground"
                        }
                        statusNode={
                          isOwn ? (
                            <MessageStatusIcon status={msg.read ? "seen" : "sent"} />
                          ) : undefined
                        }
                      />
                    </BubbleShell>
                  )}
                </div>
              );
            })}

            {/* Animated Typing Indicator */}
            {isPartnerTyping && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Composer Area — uses shared MessageInput component */}
      <MessageInput
        key={`lobby-input-${partnerUsername}`}
        onSend={handleSend}
        disabled={!isPartnerOnline}
        onTyping={handleTyping}
        onSendMediaDirectly={handleSendMediaDirectly}
        onRecordComplete={handleSendAudio}
      />
    </div>
  );
}
