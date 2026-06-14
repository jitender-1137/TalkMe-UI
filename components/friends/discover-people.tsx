"use client";

import { useState } from "react";
import { useHashSync } from "@/hooks/use-hash-sync";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, Users, MapPin, Check, UserMinus, User } from "lucide-react";
import { cn, getAvatarUrl } from "@/lib/utils";
import { useSuggestedFriends, useAddContact, useRemoveContact } from "@/src/api/hooks";
import type { SuggestedPerson } from "@/src/api/types";
import { QUERY_KEYS } from "@/src/api/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { UserProfileModal } from "@/components/chat/user-profile-modal";
import { useCreateChat } from "@/src/api/hooks/useChats";
import { useChatContext } from "@/components/chat/chat-context";
import { useNavigation } from "@/components/app-shell/navigation-context";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

const reasonLabel: Record<NonNullable<SuggestedPerson["reason"]>, string> = {
  mutual: "Mutual friends",
  interest: "Shared interests",
  nearby: "Nearby",
};

const reasonColors: Record<NonNullable<SuggestedPerson["reason"]>, string> = {
  mutual: "bg-primary/10 text-primary",
  interest: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  nearby: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export function DiscoverPeople() {
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const handleProfileClose = useHashSync(!!selectedUserId, () => setSelectedUserId(null), "#profile");

  const { data: suggestionsData, isLoading } = useSuggestedFriends();
  const addContactMutation = useAddContact();
  const removeContactMutation = useRemoveContact();
  const queryClient = useQueryClient();

  const createChatMutation = useCreateChat();
  const { setSelectedConversationId, setShowMobileSecondaryPanel } = useChatContext();
  const { setActiveTab } = useNavigation();

  // Extract items from paginated response
  const suggestions = suggestionsData?.items ?? [];

  const filtered = suggestions.filter((p) => {
    const nameMatch = p.name.toLowerCase().includes(query.toLowerCase());
    const usernameMatch = p.username.toLowerCase().includes(query.toLowerCase());
    const interestsArray = p.interests ?? p.allInterests ?? [];
    const interestMatch = interestsArray.some((i) => i.toLowerCase().includes(query.toLowerCase()));
    return nameMatch || usernameMatch || interestMatch;
  });

  const handleAdd = (id: string) => {
    addContactMutation.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOVER.SUGGESTIONS });
      },
    });
  };

  const handleRemove = (id: string) => {
    removeContactMutation.mutate(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOVER.SUGGESTIONS });
      },
    });
  };

  return (
    <div className="flex flex-col">
      {/* Search bar */}
      <div className="px-6 py-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name or interest..."
            className="pl-9 h-9 bg-muted border-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-muted-foreground">Loading suggestions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-medium text-foreground">No suggestions found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try searching for an interest or name
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-w-2xl">
            {filtered.map((person) => {
              const isAdded =
                addContactMutation.isPending && addContactMutation.variables === person.id;
              const isRemoving =
                removeContactMutation.isPending && removeContactMutation.variables === person.id;
              return (
                <SuggestionRow
                  key={person.id}
                  person={person}
                  isAdded={isAdded}
                  isRemoving={isRemoving}
                  isHovered={hoveredId === person.id}
                  onHover={() => setHoveredId(person.id)}
                  onLeave={() => setHoveredId(null)}
                  onAdd={() => handleAdd(person.id)}
                  onRemove={() => handleRemove(person.id)}
                  onProfileClick={() => setSelectedUserId(person.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      <UserProfileModal
        contact={null}
        userId={selectedUserId}
        isOpen={!!selectedUserId}
        onClose={handleProfileClose}
        onMessage={() => {
          if (selectedUserId) {
            createChatMutation.mutate(
              { participantId: selectedUserId },
              {
                onSuccess: (chat) => {
                  setSelectedConversationId(chat.id);
                  setShowMobileSecondaryPanel(false);
                  setActiveTab("chats");
                  const person = filtered.find((p) => p.id === selectedUserId);
                  // toast.success(`Starting chat with ${person?.name || "user"}`, {
                  //   icon: <MessageCircle className="h-4 w-4" />,
                  // })
                  setSelectedUserId(null);
                },
              },
            );
          }
        }}
      />
    </div>
  );
}

function SuggestionRow({
  person,
  isAdded,
  isRemoving,
  isHovered,
  onHover,
  onLeave,
  onAdd,
  onRemove,
  onProfileClick,
}: {
  person: SuggestedPerson;
  isAdded: boolean;
  isRemoving: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onAdd: () => void;
  onRemove: () => void;
  onProfileClick: () => void;
}) {
  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const reasonKey = person.reason ?? "mutual";

  return (
    <div
      className={cn(
        "relative flex items-start gap-4 p-4 rounded-xl border bg-card transition-all duration-200 cursor-default",
        isHovered ? "border-primary/30 shadow-sm bg-card" : "border-border",
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Avatar */}
      <Avatar
        className="h-11 w-11 shrink-0 border-2 border-background cursor-pointer hover:opacity-90 transition-opacity"
        onClick={onProfileClick}
      >
        <AvatarImage
          src={getAvatarUrl(person.avatar || person.images?.[0], person.gender)}
          alt={person.name}
        />
        <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          {/* Name + meta */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onProfileClick}
                className="text-sm font-semibold text-foreground hover:underline text-left focus:outline-none"
              >
                {person.name}
              </button>
              <span className="text-xs text-muted-foreground">@{person.username}</span>
            </div>

            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {/* Location */}
              {person.location && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {person.location}
                </span>
              )}
              {/* Gender */}
              {person.gender && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                  <User className="h-3 w-3 shrink-0" />
                  {person.gender}
                </span>
              )}
              {/* Mutual friends */}
              {(person.mutualFriendsCount ?? person.mutualFriends ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3 shrink-0" />
                  {person.mutualFriendsCount ?? person.mutualFriends} mutual
                </span>
              )}
              {/* Reason badge */}
              {person.reason && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                    reasonColors[person.reason],
                  )}
                >
                  {reasonLabel[person.reason]}
                </span>
              )}
            </div>

            {/* Bio — visible on hover */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isHovered ? "max-h-12 opacity-100 mt-1.5" : "max-h-0 opacity-0",
              )}
            >
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {person.bio}
              </p>
            </div>

            {/* Shared interest tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {person.sharedInterests &&
                person.sharedInterests.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              {person.allInterests && person.sharedInterests
                ? person.allInterests
                    .filter((t) => !person.sharedInterests!.includes(t))
                    .map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-muted-foreground"
                      >
                        {tag}
                      </Badge>
                    ))
                : (person.interests ?? []).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 text-muted-foreground"
                    >
                      {tag}
                    </Badge>
                  ))}
            </div>
          </div>

          {/* Add/Remove button */}
          <div className="shrink-0">
            {person.isFriend ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs font-medium border-destructive/20 hover:bg-destructive/10 text-destructive"
                disabled={isRemoving}
                onClick={onRemove}
              >
                <UserMinus className="h-3.5 w-3.5" />
                Remove Friend
              </Button>
            ) : (
              <Button
                size="sm"
                variant={isAdded ? "secondary" : "default"}
                className={cn(
                  "h-8 gap-1.5 text-xs font-medium transition-all",
                  isAdded && "text-muted-foreground pointer-events-none",
                )}
                disabled={isAdded}
                onClick={onAdd}
              >
                {isAdded ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Requested
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Friend
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
