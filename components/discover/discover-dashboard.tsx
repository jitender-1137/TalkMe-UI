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
  User,
  LayoutGrid,
  List,
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

const COUNTRIES = [
  "All",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "India",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Japan",
  "Brazil",
  "Mexico",
  "Global"
];

export function DiscoverDashboard() {
  const [query, setQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<DiscoverProfile | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [gender, setGender] = useState<string>("all");
  const [country, setCountry] = useState<string>("All");
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(99);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const queryClient = useQueryClient();
  const { data: discoverData, isLoading } = useDiscoverProfiles({
    q: query,
    gender: gender !== "all" ? gender : undefined,
    country: country !== "All" ? country : undefined,
    minAge,
    maxAge,
  });
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
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-md transition-all p-0",
                  viewMode === "grid" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground bg-transparent"
                )}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-md transition-all p-0",
                  viewMode === "list" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground bg-transparent"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search bar and Filters */}
      <div className="shrink-0 px-6 py-4 bg-card border-b border-border flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, interest, or location..."
            className="pl-9 h-10 bg-muted border-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex flex-wrap gap-4 pt-2 border-t border-border/50"
            >
              {/* Gender Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="bg-muted text-foreground border-0 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9 min-w-[120px]"
                >
                  <option value="all">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* Country Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="bg-muted text-foreground border-0 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9 min-w-[150px]"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Age Range Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Age Range</label>
                <div className="flex items-center gap-2">
                  <select
                    value={minAge}
                    onChange={(e) => setMinAge(Number(e.target.value))}
                    className="bg-muted text-foreground border-0 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9 w-[70px]"
                  >
                    {Array.from({ length: 82 }, (_, i) => i + 18).map((age) => (
                      <option key={age} value={age}>
                        {age}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">to</span>
                  <select
                    value={maxAge}
                    onChange={(e) => setMaxAge(Number(e.target.value))}
                    className="bg-muted text-foreground border-0 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9 w-[70px]"
                  >
                    {Array.from({ length: 82 }, (_, i) => i + 18).map((age) => (
                      <option key={age} value={age}>
                        {age}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reset Button */}
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setGender("all");
                    setCountry("All");
                    setMinAge(18);
                    setMaxAge(99);
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
          <div className={cn(
            "py-4 mx-auto w-full",
            viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 max-w-[1600px]"
              : "flex flex-col gap-3 max-w-xl"
          )}>
            {people.map((person) => (
              viewMode === "grid" ? (
                <PersonGridCard
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
              ) : (
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
              )
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

  const age = person.age;
  const isFemale = person.gender?.toLowerCase() === "female";

  return (
    <motion.div
      className={cn(
        "relative flex items-start gap-2.5 p-2 rounded-lg border bg-card transition-all duration-200",
        isHovered ? "border-primary/30 shadow-md bg-accent/5 translate-x-1" : "border-border",
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      layout
    >
      {/* Avatar - Clickable */}
      <button
        onClick={onProfileClick}
        className="shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
      >
        <div className="relative">
          <Avatar className="h-9 w-9 md:h-11 md:w-11 border border-background">
            <AvatarImage
              src={getAvatarUrl(person.avatar || person.images?.[0], person.gender)}
              alt={person.name}
            />
            <AvatarFallback className="bg-muted text-muted-foreground font-medium text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {(person.isOnline || person.online) && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-card rounded-full" />
          )}
        </div>
      </button>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2.5">
          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={onProfileClick}
                className={cn(
                  "text-xs font-semibold text-foreground hover:text-primary transition-colors focus:outline-none",
                  isFemale && "text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300"
                )}
              >
                {person.name}{age ? `, ${age}` : ""}
              </button>
              <span className="text-[11px] text-muted-foreground">@{person.username}</span>
              {(person.isVerified || person.verified) && (
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] px-1 py-0">
                  Verified
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {/* Location */}
              {person.location && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {person.location}
                </span>
              )}
              {/* Gender */}
              {person.gender && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground capitalize">
                  <User className="h-2.5 w-2.5 shrink-0" />
                  {person.gender}
                </span>
              )}
              {/* Occupation */}
              {person.occupation && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <Briefcase className="h-2.5 w-2.5 shrink-0" />
                  {person.occupation}
                </span>
              )}
              {/* Education */}
              {person.education && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <GraduationCap className="h-2.5 w-2.5 shrink-0" />
                  {person.education}
                </span>
              )}
            </div>

            {/* Bio — visible on hover */}
            {person.bio && (
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  isHovered ? "max-h-12 opacity-100 mt-1" : "max-h-0 opacity-0",
                )}
              >
                <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2">
                  {person.bio}
                </p>
              </div>
            )}

            {/* Interest tags */}
            <div className="flex flex-wrap gap-1 mt-1">
              {(person.interests ?? person.allInterests ?? []).slice(0, 4).map((interest) => (
                <Badge key={interest} variant="secondary" className="text-[9px] px-1 py-0">
                  {interest}
                </Badge>
              ))}
              {(person.interests ?? person.allInterests ?? []).length > 4 && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                  +{(person.interests ?? person.allInterests ?? []).length - 4}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="shrink-0 flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className={cn(
                "h-7 w-7 p-0 transition-all",
                isLiked && "border-pink-500 bg-pink-500/10",
              )}
              onClick={onLike}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5 transition-colors",
                  isLiked ? "text-pink-500 fill-pink-500" : "text-muted-foreground",
                )}
              />
            </Button>

            {person.isFriend ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[11px] font-medium border-destructive/20 hover:bg-destructive/10 text-destructive px-2"
                onClick={onRemoveFriend}
                disabled={isRemovingFriend}
              >
                {isRemovingFriend ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <UserMinus className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Remove</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[11px] font-medium border-primary/20 hover:bg-primary/10 text-primary px-2"
                onClick={onAddFriend}
                disabled={isAddingFriend}
              >
                {isAddingFriend ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <UserPlus className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Add</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="default"
              className="h-7 gap-1 text-[11px] font-medium px-2.5"
              onClick={onMessage}
            >
              <MessageCircle className="h-3 w-3" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}function PersonGridCard({
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
  const age = person.age;
  const avatarUrl = getAvatarUrl(person.avatar || person.images?.[0], person.gender);
  const isFemale = person.gender?.toLowerCase() === "female";

  return (
    <motion.div
      className="relative h-[270px] rounded-xl overflow-hidden border border-border bg-card group shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onProfileClick}
      layout
    >
      {/* Background Image / Gradient */}
      <div className="absolute inset-0 w-full h-full bg-muted overflow-hidden">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={person.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-primary/20 via-background to-secondary/20 flex items-center justify-center">
            <span className="text-2xl font-semibold text-muted-foreground">
              {person.name.charAt(0)}
            </span>
          </div>
        )}
        {/* Dark bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Top Badges (Verified & Online) */}
      <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10">
        <div className="flex items-center gap-1">
          {(person.isOnline || person.online) && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
          {(person.isVerified || person.verified) && (
            <Badge className="bg-blue-500 text-white text-[9px] px-1 py-0 border-0 shadow-xs">
              Verified
            </Badge>
          )}
        </div>
      </div>

      {/* Info Block (Glassmorphic bottom panel) */}
      <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-1 z-10 transition-transform duration-300 md:group-hover:-translate-y-1">
        <div className="min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onProfileClick();
            }}
            className={cn(
              "text-sm font-bold text-white hover:text-primary transition-colors text-left focus:outline-none flex items-center gap-1 flex-wrap drop-shadow-md",
              isFemale && "text-pink-300 hover:text-pink-400"
            )}
          >
            {person.name}{age ? `, ${age}` : ""}
          </button>
          <p className="text-[10px] text-zinc-300 font-medium drop-shadow-xs">@{person.username}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {person.location && (
            <span className="flex items-center gap-0.5 text-[10px] text-zinc-300 drop-shadow-xs">
              <MapPin className="h-2.5 w-2.5 shrink-0 text-zinc-400" />
              {person.location}
            </span>
          )}
          {person.gender && (
            <span className="flex items-center gap-0.5 text-[10px] text-zinc-300 capitalize drop-shadow-xs">
              <User className="h-2.5 w-2.5 shrink-0 text-zinc-400" />
              {person.gender}
            </span>
          )}
        </div>

        {/* Short interests tag list (max 2 for spacing) */}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {(person.interests ?? person.allInterests ?? []).slice(0, 2).map((interest) => (
            <Badge
              key={interest}
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border-0 text-[8px] px-1 py-0 backdrop-blur-xs"
            >
              {interest}
            </Badge>
          ))}
          {(person.interests ?? person.allInterests ?? []).length > 2 && (
            <span className="text-[8px] text-zinc-300 font-medium self-center drop-shadow-xs">
              +{(person.interests ?? person.allInterests ?? []).length - 2}
            </span>
          )}
        </div>

        {/* Mobile Quick Action Buttons - Hidden on desktop, permanently visible on mobile */}
        <div className="flex md:hidden items-center justify-center gap-3.5 mt-2 pt-2 border-t border-white/10 z-30">
          {/* Like */}
          <Button
            size="icon"
            variant="outline"
            className={cn(
              "h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white p-0",
              isLiked && "border-pink-500 bg-pink-500/20 text-pink-500 hover:bg-pink-500/30",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
          >
            <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-pink-500")} />
          </Button>

          {/* Add Friend */}
          {person.isFriend ? (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-destructive/20 border-white/20 text-destructive p-0"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFriend();
              }}
              disabled={isRemovingFriend}
            >
              {isRemovingFriend ? (
                <Loader2 className="h-3 w-3 animate-spin text-white" />
              ) : (
                <UserMinus className="h-3.5 w-3.5 text-white" />
              )}
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-primary/20 border-white/20 text-primary p-0"
              onClick={(e) => {
                e.stopPropagation();
                onAddFriend();
              }}
              disabled={isAddingFriend}
            >
              {isAddingFriend ? (
                <Loader2 className="h-3 w-3 animate-spin text-white" />
              ) : (
                <UserPlus className="h-3.5 w-3.5 text-white" />
              )}
            </Button>
          )}

          {/* Chat */}
          <Button
            size="icon"
            variant="default"
            className="h-8 w-8 rounded-full p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMessage();
            }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Slide up action panel - visible only on desktop hover */}
      <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-col justify-end p-3 z-20">
        {/* Floating action buttons */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {/* Like */}
          <Button
            size="icon"
            variant="outline"
            className={cn(
              "h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30 backdrop-blur-md transition-all scale-90 hover:scale-100 p-0",
              isLiked && "border-pink-500 bg-pink-500/20 text-pink-500 hover:bg-pink-500/30",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5",
                isLiked ? "text-pink-500 fill-pink-500" : "text-white",
              )}
            />
          </Button>

          {/* Add Friend */}
          {person.isFriend ? (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-destructive/20 border-white/20 hover:border-destructive/40 backdrop-blur-md transition-all scale-90 hover:scale-100 text-destructive p-0"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFriend();
              }}
              disabled={isRemovingFriend}
            >
              {isRemovingFriend ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              ) : (
                <UserMinus className="h-3.5 w-3.5 text-white group-hover:text-destructive" />
              )}
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-primary/20 border-white/20 hover:border-primary/40 backdrop-blur-md transition-all scale-90 hover:scale-100 text-primary p-0"
              onClick={(e) => {
                e.stopPropagation();
                onAddFriend();
              }}
              disabled={isAddingFriend}
            >
              {isAddingFriend ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              ) : (
                <UserPlus className="h-3.5 w-3.5 text-white group-hover:text-primary" />
              )}
            </Button>
          )}

          {/* Chat */}
          <Button
            size="icon"
            variant="default"
            className="h-8 w-8 rounded-full transition-all scale-90 hover:scale-100 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMessage();
            }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* View Profile Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 bg-white/10 hover:bg-white/20 border-white/20 text-white text-[10px] font-semibold backdrop-blur-md"
          onClick={(e) => {
            e.stopPropagation();
            onProfileClick();
          }}
        >
          View Profile
        </Button>
      </div>
    </motion.div>
  );
}
