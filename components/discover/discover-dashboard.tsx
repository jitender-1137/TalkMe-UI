"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Heart,
  MessageCircle,
  MapPin,
  Briefcase,
  GraduationCap,
  X,
  Phone,
  Video,
  Filter,
  Sparkles,
  UserPlus,
  UserCheck,
  UserMinus,
  Loader2,
} from "lucide-react";
import { cn, getAvatarUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDiscoverProfiles,
  useLikeDiscoverProfile,
  useUnlikeDiscoverProfile,
} from "@/src/api/hooks/useDiscover";
import { useCreateChat } from "@/src/api/hooks/useChats";
import { useAddContact, useRemoveContact } from "@/src/api/hooks/useContacts";
import { QUERY_KEYS } from "@/src/api/query-keys";
import { useChatContext } from "@/components/chat/chat-context";
import { useNavigation } from "@/components/app-shell/navigation-context";
import type { DiscoverProfile } from "@/src/api/types";
import { UserProfileModal } from "@/components/chat/user-profile-modal";

export function DiscoverDashboard() {
  const [query, setQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<DiscoverProfile | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: discoverData, isLoading } = useDiscoverProfiles({ q: query });
  const likeMutation = useLikeDiscoverProfile();
  const unlikeMutation = useUnlikeDiscoverProfile();
  const createChatMutation = useCreateChat();
  const addFriendMutation = useAddContact();
  const removeFriendMutation = useRemoveContact();
  const { setSelectedConversationId, setShowMobileSecondaryPanel } = useChatContext();
  const { setActiveTab } = useNavigation();

  const handleAddFriend = (person: DiscoverProfile) => {
    addFriendMutation.mutate(person.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DISCOVER.LIST] });
      },
    });
  };

  const handleRemoveFriend = (person: DiscoverProfile) => {
    removeFriendMutation.mutate(person.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DISCOVER.LIST] });
      },
    });
  };

  const people = discoverData?.items ?? [];

  const handleLike = (person: DiscoverProfile) => {
    if (person.isLiked) {
      unlikeMutation.mutate(person.id, {
        onSuccess: () => {
          toast.info(`Removed like from ${person.name}`);
          if (selectedPerson?.id === person.id) {
            setSelectedPerson((prev) => (prev ? { ...prev, isLiked: false } : null));
          }
        },
      });
    } else {
      likeMutation.mutate(person.id, {
        onSuccess: () => {
          toast.success(`You liked ${person.name}!`, {
            icon: <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />,
          });
          if (selectedPerson?.id === person.id) {
            setSelectedPerson((prev) => (prev ? { ...prev, isLiked: true } : null));
          }
        },
      });
    }
  };

  const handleMessage = (person: DiscoverProfile) => {
    createChatMutation.mutate(
      { participantId: person.id },
      {
        onSuccess: (chat) => {
          setSelectedConversationId(chat.id);
          setShowMobileSecondaryPanel(false);
          setActiveTab("chats");
          // toast.success(`Starting chat with ${person.name}`, {
          //   icon: <MessageCircle className="h-4 w-4" />,
          // })
          setSelectedPerson(null);
        },
      },
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background pb-16 md:pb-0">
      {/* Page Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Discover</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Find interesting people near you</p>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="shrink-0 px-6 py-4 bg-card border-b border-border">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, interest, or location..."
            className="pl-9 h-10 bg-muted border-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* People List */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-muted-foreground">Loading people...</p>
          </div>
        ) : people.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No people found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-4 max-w-2xl">
            {people.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                isLiked={Boolean(person.isLiked)}
                isHovered={hoveredId === person.id}
                onHover={() => setHoveredId(person.id)}
                onLeave={() => setHoveredId(null)}
                onLike={() => handleLike(person)}
                onProfileClick={() => setSelectedPerson(person)}
                onMessage={() => handleMessage(person)}
                onAddFriend={() => handleAddFriend(person)}
                onRemoveFriend={() => handleRemoveFriend(person)}
                isAddingFriend={
                  addFriendMutation.isPending && addFriendMutation.variables === person.id
                }
                isRemovingFriend={
                  removeFriendMutation.isPending && removeFriendMutation.variables === person.id
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <UserProfileModal
        contact={null}
        userId={selectedPerson?.id}
        isOpen={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onMessage={() => selectedPerson && handleMessage(selectedPerson)}
      />
    </div>
  );
}

function PersonCard({
  person,
  isLiked,
  isHovered,
  onHover,
  onLeave,
  onLike,
  onProfileClick,
  onMessage,
  onAddFriend,
  onRemoveFriend,
  isAddingFriend,
  isRemovingFriend,
}: {
  person: DiscoverProfile;
  isLiked: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onLike: () => void;
  onProfileClick: () => void;
  onMessage: () => void;
  onAddFriend: () => void;
  onRemoveFriend: () => void;
  isAddingFriend: boolean;
  isRemovingFriend: boolean;
}) {
  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const age = 25; // default fallback

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 p-3 rounded-xl border bg-card transition-all duration-200",
        isHovered ? "border-primary/30 shadow-sm" : "border-border",
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Avatar - Clickable */}
      <button
        onClick={onProfileClick}
        className="shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
      >
        <div className="relative">
          <Avatar className="h-11 w-11 md:h-14 md:w-14 border-2 border-background">
            <AvatarImage
              src={getAvatarUrl(person.avatar || person.images?.[0], person.gender)}
              alt={person.name}
            />
            <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-card rounded-full" />
        </div>
      </button>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onProfileClick}
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors focus:outline-none"
              >
                {person.name}, {age}
              </button>
              <span className="text-xs text-muted-foreground">{person.username}</span>
              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] px-1.5 py-0">
                Verified
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {/* Location */}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                {person.location}
              </span>
              {/* Occupation */}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Briefcase className="h-3 w-3 shrink-0" />
                Professional
              </span>
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

            {/* Interest tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {(person.interests ?? person.allInterests ?? []).slice(0, 4).map((interest) => (
                <Badge key={interest} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {interest}
                </Badge>
              ))}
              {(person.interests ?? person.allInterests ?? []).length > 4 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  +{(person.interests ?? person.allInterests ?? []).length - 4}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="shrink-0 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "h-8 w-8 p-0 transition-all",
                isLiked && "border-pink-500 bg-pink-500/10",
              )}
              onClick={onLike}
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-colors",
                  isLiked ? "text-pink-500 fill-pink-500" : "text-muted-foreground",
                )}
              />
            </Button>

            {person.isFriend ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs font-medium border-destructive/20 hover:bg-destructive/10 text-destructive"
                onClick={onRemoveFriend}
                disabled={isRemovingFriend}
              >
                {isRemovingFriend ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserMinus className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Remove Friend</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs font-medium border-primary/20 hover:bg-primary/10 text-primary"
                onClick={onAddFriend}
                disabled={isAddingFriend}
              >
                {isAddingFriend ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Add Friend</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="default"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={onMessage}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
