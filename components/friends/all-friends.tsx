"use client";

import { useState } from "react";
import { useHashSync } from "@/hooks/use-hash-sync";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarStatusBadge } from "@/components/presence";
import {
  Search,
  MoreHorizontal,
  MessageCircle,
  UserMinus,
  ShieldX,
  Star,
  X,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useContacts, useRemoveContact } from "@/src/api/hooks/useContacts";
import { useBlockUser } from "@/src/api/hooks/useProfile";
import { useOpenOrCreateChat } from "@/src/api/hooks/useChats";
import { useChatContext } from "@/components/chat/chat-context";
import { useNavigation } from "@/components/app-shell/navigation-context";
import type { Contact } from "@/src/api/types";
import type { PresenceStatus } from "@/lib/presence";
import { useLivePresence } from "@/lib/presence/live-status-store";
import { UserProfileModal } from "@/components/chat/user-profile-modal";

type FilterId = "all" | "online" | "close";
type ViewMode = "list" | "grid";
const CLOSE_FRIENDS_KEY = "friends:close";

function loadCloseFriends(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(CLOSE_FRIENDS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

interface AllFriendsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onlineCount: number;
  /** List / card view, controlled by the header toggle. */
  view: ViewMode;
}

export function AllFriends({ searchQuery, onSearchChange, onlineCount, view }: AllFriendsProps) {
  const { data: contacts = [], isLoading } = useContacts();
  const [filter, setFilter] = useState<FilterId>("all");
  const [closeFriends, setCloseFriends] = useState<Set<string>>(() => loadCloseFriends());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const handleProfileClose = useHashSync(
    !!selectedUserId,
    () => setSelectedUserId(null),
    "#profile",
  );

  const openOrCreateChat = useOpenOrCreateChat();
  const { setSelectedConversationId, setShowMobileSecondaryPanel, setChatReturnTab } =
    useChatContext();
  const { setActiveTab } = useNavigation();

  const persistClose = (next: Set<string>) => {
    setCloseFriends(new Set(next));
    try {
      localStorage.setItem(CLOSE_FRIENDS_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };
  const toggleClose = (id: string) => {
    const next = new Set(closeFriends);
    next.has(id) ? next.delete(id) : next.add(id);
    persistClose(next);
  };

  const q = searchQuery.trim().toLowerCase();
  const closeCount = contacts.filter((c) => closeFriends.has(c.id)).length;

  const filtered = contacts.filter((f) => {
    const matchesQuery =
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.username && f.username.toLowerCase().includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q));
    if (!matchesQuery) return false;
    if (filter === "online") return (f.presence ?? "offline") === "online";
    if (filter === "close") return closeFriends.has(f.id);
    return true;
  });

  const openMessage = async (id: string) => {
    try {
      const chat = await openOrCreateChat(id);
      setChatReturnTab("friends");
      setSelectedConversationId(chat.id);
      setShowMobileSecondaryPanel(false);
      setActiveTab("chats");
    } catch {
      /* createChat surfaces its own error toast */
    }
  };

  const chips: { id: FilterId; label: string; count: number }[] = [
    { id: "all", label: "All", count: contacts.length },
    { id: "online", label: "Online", count: onlineCount },
    { id: "close", label: "Closed", count: closeCount },
  ];

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-semibold border transition-colors cursor-pointer",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/60 text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "h-5 min-w-5 px-1 flex items-center justify-center rounded-full text-[10px] font-bold",
                  active ? "bg-primary-foreground/20" : "bg-muted-foreground/15 text-foreground",
                )}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <p className="text-sm text-muted-foreground">Loading friends...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-foreground">No friends found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search or filter</p>
        </div>
      ) : (
        <div
          className={cn(
            view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 gap-3" : "flex flex-col gap-2",
          )}
        >
          {filtered.map((friend) => (
            <FriendItem
              key={friend.id}
              friend={friend}
              view={view}
              isClose={closeFriends.has(friend.id)}
              onProfileClick={() => setSelectedUserId(friend.id)}
              onMessage={() => openMessage(friend.id)}
              onToggleClose={() => toggleClose(friend.id)}
            />
          ))}
        </div>
      )}

      <UserProfileModal
        contact={null}
        userId={selectedUserId}
        isOpen={!!selectedUserId}
        onClose={handleProfileClose}
        onMessage={async () => {
          if (selectedUserId) {
            await openMessage(selectedUserId);
            setSelectedUserId(null);
          }
        }}
      />
    </div>
  );
}

function FriendItem({
  friend,
  view,
  isClose,
  onProfileClick,
  onMessage,
  onToggleClose,
}: {
  friend: Contact;
  view: ViewMode;
  isClose: boolean;
  onProfileClick: () => void;
  onMessage: () => void;
  onToggleClose: () => void;
}) {
  const unfriendMutation = useRemoveContact();
  const blockMutation = useBlockUser();

  const liveById = useLivePresence(friend.id);
  const liveByUserId = useLivePresence(friend.userId);
  const status = (liveById?.status ??
    liveByUserId?.status ??
    friend.presence ??
    "offline") as PresenceStatus;

  const fallback = friend.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const username = friend.username
    ? `@${friend.username}`
    : `@${friend.name.toLowerCase().replace(/\s+/g, "")}`;

  const isAway = status === "idle";

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onMessage}>
          <MessageCircle className="h-4 w-4" />
          Send message
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onToggleClose}>
          <Star className={cn("h-4 w-4", isClose && "fill-current text-primary")} />
          {isClose ? "Remove close friend" : "Add to close friends"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={() => unfriendMutation.mutate(friend.id)}
        >
          <UserMinus className="h-4 w-4" />
          Unfriend
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          onClick={() =>
            unfriendMutation.mutate(friend.id, {
              onSuccess: () => blockMutation.mutate(friend.id),
            })
          }
        >
          <ShieldX className="h-4 w-4" />
          Block user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const avatar = (
    <AvatarStatusBadge
      fallback={fallback}
      status={status}
      size="lg"
      src={friend.avatar || undefined}
      gender={friend.gender}
    />
  );

  const closeBadge = isClose && (
    <span className="shrink-0 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[11px] font-medium">
      Closed
    </span>
  );

  // ── Card (grid) layout ──────────────────────────────────────────────────────
  if (view === "grid") {
    return (
      <div className="relative flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/60 bg-card/50">
        <div className="absolute top-1.5 right-1.5">{menu}</div>
        <button onClick={onProfileClick} className="cursor-pointer" aria-label="View profile">
          {avatar}
        </button>
        <div className="text-center min-w-0 w-full">
          <p className="font-semibold text-sm text-foreground truncate">{friend.name}</p>
          <p className="text-xs text-muted-foreground truncate">{username}</p>
        </div>
        {closeBadge}
        {isAway ? (
          <span className="mt-1 flex items-center justify-center gap-1 w-full h-9 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-sm font-medium">
            <Clock className="h-3.5 w-3.5" />
            Away
          </span>
        ) : (
          <button
            onClick={onMessage}
            className="mt-1 flex items-center justify-center gap-1.5 w-full h-9 rounded-full bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </button>
        )}
      </div>
    );
  }

  // ── List (row) layout ───────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-2xl border border-border/60 bg-card/50">
      <button
        onClick={onProfileClick}
        className="shrink-0 cursor-pointer"
        aria-label="View profile"
      >
        {avatar}
      </button>

      <button onClick={onProfileClick} className="flex-1 min-w-0 text-left cursor-pointer">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground truncate">{friend.name}</span>
          {closeBadge}
        </div>
        <p className="text-xs text-muted-foreground truncate">{username}</p>
      </button>

      <div className="flex items-center gap-1.5 shrink-0">
        {isAway ? (
          <span className="flex items-center gap-1 h-9 px-3 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-sm font-medium">
            <Clock className="h-3.5 w-3.5" />
            Away
          </span>
        ) : (
          <button
            onClick={onMessage}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden md:block">Message</span>
          </button>
        )}
        {menu}
      </div>
    </div>
  );
}
