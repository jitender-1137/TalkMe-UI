"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Users, UserPlus, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AllFriends } from "./all-friends";
import { FriendRequests } from "./friend-requests";
import { FriendsHeader, FriendsTabs, type FriendsTab } from "./friends-header";
import { useContacts, useContactRequests } from "@/src/api/hooks/useContacts";
import { useNavigation } from "@/components/app-shell/navigation-context";
import { useScrollRestore } from "@/lib/navigation/scroll-restore";

const FRIENDS_TABS = ["all", "requests"] as const;
type FriendsSubtab = (typeof FRIENDS_TABS)[number];
const STORAGE_KEY = "friends:last-subtab";

type ViewMode = "list" | "grid";
const VIEW_KEY = "friends:view";
function loadView(): ViewMode {
  if (typeof window === "undefined") return "list";
  try {
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function FriendsDashboard({ onBack }: { onBack?: () => void }) {
  const { setActiveTab: setMainTab } = useNavigation();
  const [activeTab, setActiveTab] = useState<FriendsSubtab>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<ViewMode>(() => loadView());

  const applyView = (next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const { data: contacts = [], refetch: refetchContacts } = useContacts();
  const { data: requests = [], refetch: refetchRequests } = useContactRequests();
  const requestCount = requests.length;

  // Restore last subtab when re-entering Friends (component unmounts on tab switch).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY) as FriendsSubtab | null;
      if (saved && FRIENDS_TABS.includes(saved)) setActiveTab(saved);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

  // Scroll container + pull-to-refresh (mobile).
  const scrollRef = useRef<HTMLDivElement>(null);
  // Preserve scroll across opens/closes (Friends is itself an overlay, so it
  // must NOT lock — it's the active scroller).
  useScrollRestore(scrollRef, "tab:friends");
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchContacts(), refetchRequests()]);
  }, [refetchContacts, refetchRequests]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const PULL_THRESHOLD = 70;
    let startY: number | null = null;
    let distance = 0;
    const onTouchStart = (e: TouchEvent) => {
      startY = el.scrollTop <= 0 && !isRefreshing ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY == null || isRefreshing) return;
      const delta = e.touches[0].clientY - startY;
      if (delta > 0 && el.scrollTop <= 0) {
        distance = Math.min(delta * 0.5, 90);
        setPullDistance(distance);
        if (e.cancelable) e.preventDefault();
      } else if (distance !== 0) {
        distance = 0;
        setPullDistance(0);
      }
    };
    const onTouchEnd = async () => {
      if (startY == null) return;
      startY = null;
      if (distance >= PULL_THRESHOLD && !isRefreshing) {
        setPullDistance(0);
        distance = 0;
        setIsRefreshing(true);
        try {
          await handleRefresh();
        } finally {
          setIsRefreshing(false);
        }
      } else {
        distance = 0;
        setPullDistance(0);
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [handleRefresh, isRefreshing]);

  // Swipe to switch between the two tabs (mobile) — ignores horizontal scrollers.
  const swipeStart = useRef<{ x: number; y: number; inScroller: boolean } | null>(null);
  const startedInHScroller = (target: EventTarget | null) => {
    let node = target as HTMLElement | null;
    while (node && node !== scrollRef.current) {
      const ox = getComputedStyle(node).overflowX;
      if ((ox === "auto" || ox === "scroll") && node.scrollWidth > node.clientWidth + 4) return true;
      node = node.parentElement;
    }
    return false;
  };
  const onSwipeStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      swipeStart.current = null;
      return;
    }
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY, inScroller: startedInHScroller(e.target) };
  };
  const onSwipeEnd = (e: React.TouchEvent) => {
    const s = swipeStart.current;
    swipeStart.current = null;
    const el = typeof document !== "undefined" ? document.activeElement : null;
    if (!s || s.inScroller || el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = FRIENDS_TABS.indexOf(activeTab);
    if (dx < 0 && idx < FRIENDS_TABS.length - 1) setActiveTab(FRIENDS_TABS[idx + 1]);
    else if (dx > 0 && idx > 0) setActiveTab(FRIENDS_TABS[idx - 1]);
  };

  const handleSearchToggle = useCallback(() => {
    setSearchOpen((open) => {
      if (open) setSearchQuery("");
      return !open;
    });
  }, []);

  const onlineCount = contacts.filter((c) => (c.presence ?? "offline") === "online").length;

  const tabs: FriendsTab[] = [
    { id: "all", label: "All Friends", icon: Users },
    { id: "requests", label: "Requests", icon: UserPlus, badge: requestCount },
  ];

  const isAll = activeTab === "all";

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden bg-background">
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        {/* Header + subtabs stay pinned (sticky) while the content scrolls. */}
        <div className="sticky top-0 z-30 bg-background border-b border-border/40 dark:border-white/5">
          <FriendsHeader
            subtitle={
              isAll
                ? "Stay connected with people who matter to you 💜"
                : "Manage your requests and grow your network ✨"
            }
            leadingIcon={isAll ? Users : UserPlus}
            decoration={isAll ? "network" : "aurora"}
            showSearch={isAll}
            searchOpen={searchOpen}
            onSearchToggle={handleSearchToggle}
            view={isAll ? view : undefined}
            onViewChange={isAll ? applyView : undefined}
            onBack={onBack}
            onAddFriend={() => setMainTab("discover")}
            onSettings={() => setMainTab("settings")}
            avatars={contacts.map((c) => c.avatar || "").filter(Boolean)}
          />

          {/* Subtabs — out of the header, with the search bar opening below them */}
          <div className="max-w-2xl mx-auto w-full px-3 md:px-1 pt-2 pb-3">
          <FriendsTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as FriendsSubtab)}
          />
          {isAll && searchOpen && (
            <div className="mt-3 flex items-center h-11 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 px-4 focus-within:border-primary/40">
              <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none p-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 rounded-full hover:bg-muted-foreground/20 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center overflow-hidden shrink-0 transition-[height] duration-150"
            style={{ height: isRefreshing ? 44 : pullDistance }}
          >
            <Loader2
              className={cn("h-5 w-5 text-primary", isRefreshing && "animate-spin")}
              style={{
                opacity: isRefreshing ? 1 : Math.min(pullDistance / 70, 1),
                transform: isRefreshing ? undefined : `rotate(${(pullDistance / 70) * 270}deg)`,
              }}
            />
          </div>
        )}

        <div
          onTouchStart={onSwipeStart}
          onTouchEnd={onSwipeEnd}
          className="max-w-2xl mx-auto w-full px-3 md:px-1 pt-1 pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-6"
        >
          {isAll ? (
            <AllFriends
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onlineCount={onlineCount}
              view={view}
            />
          ) : (
            <FriendRequests searchQuery={searchQuery} />
          )}
        </div>
      </div>
    </div>
  );
}
