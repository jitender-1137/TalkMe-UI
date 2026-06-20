"use client";

import { useState } from "react";
import { useHashSync } from "@/hooks/use-hash-sync";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarStatusBadge } from "@/components/presence";
import { Search, MoreHorizontal, MessageCircle, UserMinus, ShieldX } from "lucide-react";
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
import { toast } from "sonner";

const statusLabel: Record<PresenceStatus, string> = {
  online: "Online",
  idle: "Away",
  offline: "Offline",
};

export function AllFriends() {
  const { data: contacts = [], isLoading } = useContacts();
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const handleProfileClose = useHashSync(!!selectedUserId, () => setSelectedUserId(null), "#profile");

  const openOrCreateChat = useOpenOrCreateChat();
  const { setSelectedConversationId, setShowMobileSecondaryPanel, setChatReturnTab } = useChatContext();
  const { setActiveTab } = useNavigation();

  const filtered = contacts.filter(
    (f) =>
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      (f.email && f.email.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="flex flex-col">
      {/* Search + count row */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search friends..."
            className="pl-9 h-9 bg-muted border-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "friend" : "friends"}
        </span>
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-6 pb-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">Loading friends...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-foreground">No friends found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onProfileClick={() => setSelectedUserId(friend.id)}
              />
            ))}
          </div>
        )}
      </div>

      <UserProfileModal
        contact={null}
        userId={selectedUserId}
        isOpen={!!selectedUserId}
        onClose={handleProfileClose}
        onMessage={async () => {
          if (selectedUserId) {
            try {
              // Reuse an existing 1:1 chat instead of creating a duplicate.
              const chat = await openOrCreateChat(selectedUserId);
              setChatReturnTab("friends");
              setSelectedConversationId(chat.id);
              setShowMobileSecondaryPanel(false);
              setActiveTab("chats");
              setSelectedUserId(null);
            } catch {
              /* createChat surfaces its own error toast */
            }
          }
        }}
      />
    </div>
  );
}

function FriendCard({ friend, onProfileClick }: { friend: Contact; onProfileClick: () => void }) {
  const unfriendMutation = useRemoveContact();
  const blockMutation = useBlockUser();
  const openOrCreateChat = useOpenOrCreateChat();
  const { setSelectedConversationId, setShowMobileSecondaryPanel, setChatReturnTab } = useChatContext();
  const { setActiveTab } = useNavigation();

  const handleUnfriend = () => {
    unfriendMutation.mutate(friend.id);
  };

  const handleBlock = () => {
    unfriendMutation.mutate(friend.id, {
      onSuccess: () => {
        blockMutation.mutate(friend.id);
      },
    });
  };

  const [isStartingChat, setIsStartingChat] = useState(false);
  const handleMessageClick = async () => {
    if (isStartingChat) return;
    setIsStartingChat(true);
    try {
      // Reuse an existing 1:1 chat instead of creating a duplicate.
      const chat = await openOrCreateChat(friend.id);
      setChatReturnTab("friends");
      setSelectedConversationId(chat.id);
      setShowMobileSecondaryPanel(false);
      setActiveTab("chats");
    } catch {
      /* createChat surfaces its own error toast */
    } finally {
      setIsStartingChat(false);
    }
  };

  const username = friend.username
    ? `@${friend.username}`
    : `@${friend.name.toLowerCase().replace(/\s+/g, "")}`;
  // Real-time presence from the shared global store. The presence payload's
  // userId is the user UUID — here that's `friend.id` (same value used as the
  // createChat participantId); `friend.userId` is a different/empty field, so
  // keying on it silently never matched. Fall back to userId then stored value.
  const liveById = useLivePresence(friend.id);
  const liveByUserId = useLivePresence(friend.userId);
  const livePresence = liveById ?? liveByUserId;
  const status = (livePresence?.status ?? friend.presence ?? "offline") as PresenceStatus;

  return (
    <div className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200">
      {/* Action menu — top right */}
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Friend options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleMessageClick}>
              <MessageCircle className="h-4 w-4" />
              Send message
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={handleUnfriend}
            >
              <UserMinus className="h-4 w-4" />
              Unfriend
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={handleBlock}
            >
              <ShieldX className="h-4 w-4" />
              Block user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Avatar + name */}
      <div
        className="flex flex-col items-center gap-2 pt-1 cursor-pointer hover:opacity-85 transition-opacity"
        onClick={onProfileClick}
      >
        <AvatarStatusBadge
          fallback={friend.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)}
          status={status}
          size="xl"
          src={friend.avatar || undefined}
          gender={friend.gender}
        />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground leading-tight">{friend.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{username}</p>
        </div>
      </div>

      {/* Status + mutual */}
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-medium",
            status === "online" && "text-emerald-600 dark:text-emerald-400",
            status === "idle" && "text-amber-600 dark:text-amber-400",
            status === "offline" && "text-muted-foreground",
          )}
        >
          {statusLabel[status]}
        </span>
        <span className="text-muted-foreground">0 mutual</span>
      </div>

      {/* Interest tags */}
      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          Friend
        </Badge>
      </div>

      {/* Message CTA */}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs mt-1 gap-1.5"
        onClick={handleMessageClick}
        disabled={isStartingChat}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Message
      </Button>
    </div>
  );
}
