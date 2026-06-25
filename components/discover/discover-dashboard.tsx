"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useHashSync } from "@/hooks/use-hash-sync";
import { useLivePresence, useLivePresenceStore } from "@/lib/presence/live-status-store";
import { useWebSocket } from "@/components/providers/websocket-provider";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/ui/app-layout";

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
  Compass,
  RefreshCw,
  Bookmark,
} from "lucide-react";
import { cn, getAvatarUrl } from "@/lib/utils";
import {
  HEADER_ICON_BTN,
  HEADER_ICON_BTN_ACTIVE,
  HEADER_ICON,
} from "@/components/ui/header-button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDiscoverProfiles,
  useLikeDiscoverProfile,
  useUnlikeDiscoverProfile,
} from "@/src/api/hooks/useDiscover";
import { useOpenOrCreateChat } from "@/src/api/hooks/useChats";
import { useAddContact, useRemoveContact } from "@/src/api/hooks/useContacts";
import { useProfile } from "@/src/api/hooks/useProfile";
import {
  DEFAULT_DISCOVER_FILTERS,
  DEFAULT_COUNTRY,
  loadDiscoverFilters,
  saveDiscoverFilters,
  loadDiscoverView,
  saveDiscoverView,
  getDiscoverTempCountry,
  setDiscoverTempCountry,
  clearDiscoverTempCountry,
} from "@/lib/discover-filters";
import { COUNTRY_FILTER_OPTIONS } from "@/lib/countries";
import { getTabFromHash } from "@/lib/navigation/url-hash";
import { QUERY_KEYS } from "@/src/api/query-keys";
import { useChatContext } from "@/components/chat/chat-context";
import { useNavigation } from "@/components/app-shell/navigation-context";
import type { DiscoverProfile } from "@/src/api/types";
import { UserProfileModal } from "@/components/chat/user-profile-modal";

/** Green star-burst badge with a bookmark glyph (matches the other tabs). */
function DiscoverLogo() {
  return (
    <div className="relative h-11 w-11 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
      <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="disc-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.16 165)" />
            <stop offset="100%" stopColor="oklch(0.5 0.16 175)" />
          </linearGradient>
        </defs>
        <path
          d="M22 1 L29 7 L38 6 L37 15 L43 22 L37 29 L38 38 L29 37 L22 43 L15 37 L6 38 L7 29 L1 22 L7 15 L6 6 L15 7 Z"
          fill="url(#disc-logo)"
        />
      </svg>
      <Bookmark className="absolute inset-0 m-auto h-5 w-5 text-white" strokeWidth={2.4} />
    </div>
  );
}

/** Cosmic backdrop: nebula glow, orbits, a ringed planet, a moon, a shooting
 *  star and a little constellation (right-weighted, theme-safe). */
function DiscoverBackdrop() {
  return (
    <svg
      viewBox="0 0 900 120"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        {/* <linearGradient id="disc-bg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.6 0.18 165)" stopOpacity="0" />
          <stop offset="60%" stopColor="oklch(0.55 0.18 165)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="oklch(0.55 0.2 175)" stopOpacity="0.38" />
        </linearGradient> */}
        <radialGradient id="disc-planet" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="oklch(0.82 0.16 165)" />
          <stop offset="100%" stopColor="oklch(0.45 0.16 175)" />
        </radialGradient>
        <radialGradient id="disc-nebula" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.7 0.2 160)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="oklch(0.7 0.2 160)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="disc-shoot" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.95 0.06 165)" stopOpacity="0" />
          <stop offset="100%" stopColor="oklch(0.95 0.06 165)" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="900" height="120" fill="url(#disc-bg)" />
      <ellipse cx="700" cy="60" rx="240" ry="120" fill="url(#disc-nebula)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="6s" repeatCount="indefinite" />
      </ellipse>

      {/* faint orbital swirls */}
      <g stroke="oklch(0.8 0.1 165)" strokeOpacity="0.12" fill="none">
        <path d="M120 100 Q 420 30 760 80" />
        <path d="M200 115 Q 520 60 880 95" />
        <ellipse cx="815" cy="58" rx="78" ry="26" transform="rotate(-18 815 58)" />
      </g>

      {/* constellation */}
      <g stroke="oklch(0.9 0.05 165)" strokeOpacity="0.25" strokeWidth="0.8" fill="none">
        <path d="M540 40 L 580 26 L 624 44 L 660 22" />
      </g>

      {/* stars (twinkling) */}
      {[
        [620, 30, 1.3],
        [690, 18, 1],
        [560, 55, 1],
        [840, 24, 1.2],
        [740, 95, 1],
        [500, 30, 1],
        [660, 70, 0.9],
        [880, 88, 1.1],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="oklch(0.94 0.04 165)" fillOpacity="0.85">
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur={`${2 + (i % 3)}s`}
            begin={`${i * 0.3}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* sparkle (4-point), gently rotating */}
      <path
        d="M585 64 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z"
        fill="oklch(0.95 0.06 165)"
        fillOpacity="0.8"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 585 67"
          to="360 585 67"
          dur="9s"
          repeatCount="indefinite"
        />
      </path>

      {/* shooting star — sweeps across on a loop */}
      <g>
        <line
          x1="0"
          y1="0"
          x2="70"
          y2="18"
          stroke="url(#disc-shoot)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="70" cy="18" r="2" fill="oklch(0.97 0.03 165)" />
        <animateTransform
          attributeName="transform"
          type="translate"
          values="430 8; 700 80; 760 110"
          keyTimes="0;0.7;1"
          dur="5s"
          begin="1s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          keyTimes="0;0.1;0.7;1"
          dur="5s"
          begin="1s"
          repeatCount="indefinite"
        />
      </g>

      {/* small moon (gentle bob) */}
      <path
        d="M690 96 a11 11 0 1 0 0 -22 a9 9 0 0 1 0 22 z"
        fill="oklch(0.85 0.08 165)"
        fillOpacity="0.5"
      >
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -4; 0 0"
          dur="5s"
          repeatCount="indefinite"
        />
      </path>

      {/* ringed planet (slowly spinning ring) */}
      <g transform="translate(490 32)">
        <ellipse
          rx="42"
          ry="12"
          transform="rotate(-22)"
          fill="none"
          stroke="oklch(0.7 0.18 170)"
          strokeWidth="4"
          strokeOpacity="0.85"
        />
        <circle r="24" fill="url(#disc-planet)" />
        <ellipse
          rx="42"
          ry="12"
          fill="none"
          stroke="oklch(0.85 0.14 165)"
          strokeWidth="2"
          strokeOpacity="0.6"
          strokeDasharray="60 120"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="-22"
            to="338"
            dur="12s"
            repeatCount="indefinite"
          />
        </ellipse>
      </g>

      {/* ringed planet (slowly spinning ring) */}
      <g transform="translate(815 58)">
        <ellipse
          rx="42"
          ry="12"
          transform="rotate(-22)"
          fill="none"
          stroke="oklch(0.7 0.18 170)"
          strokeWidth="4"
          strokeOpacity="0.85"
        />
        <circle r="24" fill="url(#disc-planet)" />
        <ellipse
          rx="42"
          ry="12"
          fill="none"
          stroke="oklch(0.85 0.14 165)"
          strokeWidth="2"
          strokeOpacity="0.6"
          strokeDasharray="60 120"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="-22"
            to="338"
            dur="12s"
            repeatCount="indefinite"
          />
        </ellipse>
      </g>
    </svg>
  );
}

export function DiscoverDashboard() {
  const [query, setQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<DiscoverProfile | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  // Filters start at defaults (stable SSR/first paint), then get hydrated from
  // localStorage in an effect — avoids a hydration mismatch on the static export.
  const [gender, setGender] = useState<string>(DEFAULT_DISCOVER_FILTERS.gender);
  // Country is temporary: restore an in-memory selection carried over from a
  // chats round-trip, otherwise start at "All" (defaults to the user's country
  // once the profile loads).
  const [country, setCountry] = useState<string>(getDiscoverTempCountry() ?? DEFAULT_COUNTRY);
  const [minAge, setMinAge] = useState<number>(DEFAULT_DISCOVER_FILTERS.minAge);
  const [maxAge, setMaxAge] = useState<number>(DEFAULT_DISCOVER_FILTERS.maxAge);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // Gate the first fetch until persisted filters are loaded, so we don't fetch
  // with the wrong (default) values and then immediately refetch.
  const [filtersReady, setFiltersReady] = useState(false);
  // True when a temporary country was carried over on mount — stops the
  // user-country default from overriding it.
  const hadTempCountry = useRef(getDiscoverTempCountry() != null);

  const { data: ownProfile } = useProfile();
  const userCountry = ownProfile?.country ?? null;

  const handleProfileClose = useHashSync(
    !!selectedPerson,
    () => setSelectedPerson(null),
    "#profile",
  );

  // 1. Hydrate persisted filters (gender + age) from localStorage on mount.
  //    Country is NOT persisted — it's restored from the in-memory temp value
  //    (set when returning from the chats tab), else defaults below.
  useEffect(() => {
    const saved = loadDiscoverFilters();
    if (saved) {
      if (typeof saved.gender === "string") setGender(saved.gender);
      if (typeof saved.minAge === "number") setMinAge(saved.minAge);
      if (typeof saved.maxAge === "number") setMaxAge(saved.maxAge);
    }
    const savedView = loadDiscoverView();
    if (savedView) setViewMode(savedView);
    setFiltersReady(true);
  }, []);

  // 2. Default the country to the logged-in user's country — only when there's
  //    no temporary selection carried over (e.g. from a chats round-trip).
  useEffect(() => {
    if (!filtersReady || hadTempCountry.current) return;
    if (userCountry && country === DEFAULT_COUNTRY) {
      setCountry(userCountry);
    }
  }, [filtersReady, userCountry, country]);

  // 3. Persist gender + age (NOT country) whenever they change.
  useEffect(() => {
    if (!filtersReady) return;
    saveDiscoverFilters({ gender, minAge, maxAge });
  }, [filtersReady, gender, minAge, maxAge]);

  // 4. Reset the temporary country when leaving Discover for any tab OTHER than
  //    chats. By unmount time the hash already points at the destination tab, so
  //    a trip to message someone (#chats) keeps the filter; everything else
  //    clears it, so it re-defaults to the user's country next time.
  useEffect(() => {
    return () => {
      const destTab = getTabFromHash(window.location.hash);
      if (destTab !== "chats") clearDiscoverTempCountry();
    };
  }, []);

  // Persist the view mode (card grid vs list) once hydrated.
  useEffect(() => {
    if (!filtersReady) return;
    saveDiscoverView(viewMode);
  }, [filtersReady, viewMode]);

  const queryClient = useQueryClient();
  // When the user is searching, ignore the age/country/gender filters so the
  // query hits ALL (non-deleted) users — search is global, not filter-scoped.
  const isSearching = query.trim().length > 0;
  const {
    data: discoverData,
    isLoading,
    isFetching,
    refetch,
  } = useDiscoverProfiles(
    isSearching
      ? { q: query.trim() }
      : {
          q: query,
          gender: gender !== "all" ? gender : undefined,
          country: country !== "All" ? country : undefined,
          minAge,
          maxAge,
        },
    { enabled: filtersReady },
  );
  // Ensure the dropdown always contains the currently-selected country and the
  // user's own country, even if they aren't in the preset list.
  const countryOptions = useMemo(() => {
    const list = [...COUNTRY_FILTER_OPTIONS];
    for (const c of [userCountry, country]) {
      if (c && !list.includes(c)) list.push(c);
    }
    return list;
  }, [userCountry, country]);

  // Any filter that narrows the result set (drives the indicator dot).
  const hasActiveFilters =
    gender !== "all" ||
    country !== "All" ||
    minAge !== DEFAULT_DISCOVER_FILTERS.minAge ||
    maxAge !== DEFAULT_DISCOVER_FILTERS.maxAge;

  const likeMutation = useLikeDiscoverProfile();
  const unlikeMutation = useUnlikeDiscoverProfile();
  const openOrCreateChat = useOpenOrCreateChat();
  const addFriendMutation = useAddContact();
  const removeFriendMutation = useRemoveContact();
  const { setSelectedConversationId, setShowMobileSecondaryPanel, setChatReturnTab } =
    useChatContext();
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

  // Online users ALWAYS on top. The backend already returns online-first, but
  // presence changes live on the client — so re-sort here against the live
  // presence store (falling back to the fetched isOnline flag until a live event
  // arrives) to keep online users pinned to the top as statuses flip. Array.sort
  // is stable, so the backend's order is preserved within each group.
  const livePresence = useLivePresenceStore((s) => s.byUser);
  const people = useMemo(() => {
    const raw = discoverData?.items ?? [];
    const isOnline = (p: any) =>
      (livePresence[p.id]?.status ?? (p.isOnline ? "online" : "offline")) === "online";
    return [...raw].sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)));
  }, [discoverData?.items, livePresence]);

  // Subscribe to the displayed people's presence so their online dots update in
  // real time (sticky so the contacts sync won't drop these non-contacts). The
  // PersonCard/PersonGridCard read live status from the shared store.
  const { subscribeToPresence } = useWebSocket();
  const peopleUsernames = people
    .map((p: any) => p.username)
    .filter(Boolean)
    .join(",");
  useEffect(() => {
    if (!peopleUsernames) return;
    peopleUsernames.split(",").forEach((u) => subscribeToPresence(u, true));
  }, [peopleUsernames, subscribeToPresence]);

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

  const handleMessage = async (person: DiscoverProfile) => {
    try {
      // Reuse an existing 1:1 chat with this person instead of creating a duplicate.
      const chat = await openOrCreateChat(person.id);
      // Remember where we came from so mobile Back returns to Discover.
      setChatReturnTab("discover");
      setSelectedConversationId(chat.id);
      setShowMobileSecondaryPanel(false);
      // The tab switch updates the URL via replaceState in NavigationProvider.
      // No manual location.hash assignment (it would push a history entry).
      setActiveTab("chats");
      setSelectedPerson(null);
    } catch {
      /* createChat surfaces its own error toast */
    }
  };

  return (
    <div className="h-full w-full">
      <AppLayout
        title="Discover"
        icon={Compass}
        logoNode={<DiscoverLogo />}
        headerBackdrop={<DiscoverBackdrop />}
        subtitle="Explore. Connect. Share."
        disableCollapse
        scrollKey="tab:discover"
        searchPlaceholder="Search by name, interest, or location..."
        searchValue={query}
        onSearchChange={setQuery}
        onRefresh={async () => {
          await refetch();
        }}
        searchRight={
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Filters"
            className={cn(HEADER_ICON_BTN, "relative", showFilters && HEADER_ICON_BTN_ACTIVE)}
          >
            <Filter className={HEADER_ICON} />
            {/* Dot when any filter is narrowing results. */}
            {hasActiveFilters && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
            )}
          </button>
        }
        headerRight={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              className={cn(HEADER_ICON_BTN, viewMode === "grid" && HEADER_ICON_BTN_ACTIVE)}
            >
              <LayoutGrid className={HEADER_ICON} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              aria-label="List view"
              className={cn(HEADER_ICON_BTN, viewMode === "list" && HEADER_ICON_BTN_ACTIVE)}
            >
              <List className={HEADER_ICON} />
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh"
              title="Refresh"
              className={cn(HEADER_ICON_BTN, "disabled:opacity-50")}
            >
              <RefreshCw className={cn(HEADER_ICON, isFetching && "animate-spin")} />
            </button>
          </div>
        }
      >
        {/* Expandable filters section - Scrolls with the list content */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden flex flex-wrap gap-4 px-6 py-4 bg-muted/30 border-b border-border/50"
            >
              {/* Gender + Country — kept together on a single line */}
              <div className="flex gap-4 w-full">
                {/* Gender Filter */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <label className="text-xs font-semibold text-muted-foreground">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-muted text-foreground border-0 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                  >
                    <option value="all">All</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                {/* Country Filter */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <label className="text-xs font-semibold text-muted-foreground">Country</label>
                  <select
                    value={country}
                    onChange={(e) => {
                      // Remember the explicit choice in-memory so it survives a
                      // chats round-trip (and marks it non-default).
                      setCountry(e.target.value);
                      setDiscoverTempCountry(e.target.value);
                      hadTempCountry.current = true;
                    }}
                    className="w-full bg-muted text-foreground border-0 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-9"
                  >
                    {countryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
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
                  className="h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => {
                    // Reset to defaults — country falls back to the user's own,
                    // and the temporary override is cleared.
                    setGender(DEFAULT_DISCOVER_FILTERS.gender);
                    setMinAge(DEFAULT_DISCOVER_FILTERS.minAge);
                    setMaxAge(DEFAULT_DISCOVER_FILTERS.maxAge);
                    clearDiscoverTempCountry();
                    hadTempCountry.current = false;
                    setCountry(userCountry ?? DEFAULT_COUNTRY);
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* People List */}
        <div className="flex-1 px-4 pb-24">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm text-muted-foreground">Loading people...</p>
            </div>
          ) : people.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No people found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div
              className={cn(
                "py-1 mx-auto w-full",
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 max-w-[1600px]"
                  : "flex flex-col gap-3 max-w-xl",
              )}
            >
              {people.map((person) =>
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
                ),
              )}
            </div>
          )}
        </div>
      </AppLayout>

      {/* Profile Modal */}
      <UserProfileModal
        contact={null}
        userId={selectedPerson?.id}
        isOpen={!!selectedPerson}
        onClose={handleProfileClose}
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
  // Real-time presence from the shared store (falls back to the API value).
  const live = useLivePresence(person.id);
  const presenceStatus = live ? live.status : person.isOnline ? "online" : "offline";

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
          {presenceStatus !== "offline" && (
            <span
              className={cn(
                "absolute bottom-0 right-0 w-2.5 h-2.5 border border-card rounded-full",
                presenceStatus === "online" ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
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
                  isFemale &&
                    "text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300",
                )}
              >
                {person.name}
                {age ? `, ${age}` : ""}
              </button>
              <span className="text-[11px] text-muted-foreground">@{person.username}</span>
              {person.isVerified && (
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
}
function PersonGridCard({
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
  // Real-time presence from the shared store (falls back to the API value).
  const live = useLivePresence(person.id);
  const presenceStatus = live ? live.status : person.isOnline ? "online" : "offline";

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
          {presenceStatus === "online" && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
          {presenceStatus === "idle" && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          )}
          {person.isVerified && (
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
              isFemale && "text-pink-300 hover:text-pink-400",
            )}
          >
            {person.name}
            {age ? `, ${age}` : ""}
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
              className={cn("h-3.5 w-3.5", isLiked ? "text-pink-500 fill-pink-500" : "text-white")}
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
