"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollRestore } from "@/lib/navigation/scroll-restore";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Loader2, BadgeCheck, Users, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getAvatarUrl } from "@/lib/utils";
import { useProfile } from "@/src/api/hooks/useProfile";
import {
  useFollowers,
  useFollowing,
  useFollowUser,
  useUnfollowUser,
} from "@/src/api/hooks/useFollow";

export type FollowListTab = "followers" | "following";

interface FollowListModalProps {
  /** Whose followers / following to show. */
  userId: string | null;
  /** Shown in the header. */
  username?: string;
  /** Authoritative totals from the profile (the list endpoint's meta can be 0). */
  followersCount?: number;
  followingCount?: number;
  isOpen: boolean;
  initialTab?: FollowListTab;
  onClose: () => void;
  /** Open a user's profile (tapping a row). */
  onSelectUser?: (id: string) => void;
}

/** Reusable Followers / Following list — both tabs in one modal. */
export function FollowListModal({
  userId,
  username,
  followersCount,
  followingCount,
  isOpen,
  initialTab = "followers",
  onClose,
  onSelectUser,
}: FollowListModalProps) {
  const [tab, setTab] = useState<FollowListTab>(initialTab);
  const [query, setQuery] = useState("");
  // Optimistic follow overrides (the "me" following query isn't auto-invalidated).
  const [localFollow, setLocalFollow] = useState<Record<string, boolean>>({});

  // Preserve scroll per owner + tab (followers vs following scroll separately).
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollRestore(scrollRef, `modal:follow:${userId ?? "none"}:${tab}`);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setQuery("");
      setLocalFollow({});
    }
  }, [isOpen, initialTab]);

  // ── Swipe between Followers / Following (this modal only) ──────────────────
  // stopPropagation keeps the gesture from reaching the News tab's swipe handler
  // (this modal is portaled, but React events still bubble through its tree).
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const onPanelTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    swipeStart.current =
      e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  };
  const onPanelTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    const s = swipeStart.current;
    swipeStart.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    setTab(dx < 0 ? "following" : "followers");
  };

  const { data: ownProfile } = useProfile();
  const { data: ownFollowing } = useFollowing("me");
  // Fetch both while the modal is open so each tab shows its true total count
  // (meta.total) and switching tabs is instant.
  const { data: followers, isLoading: loadingFollowers } = useFollowers(isOpen ? userId || "" : "");
  const { data: following, isLoading: loadingFollowing } = useFollowing(isOpen ? userId || "" : "");

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const followingIds = useMemo(
    () => new Set((ownFollowing?.items || []).map((u: any) => u.id)),
    [ownFollowing],
  );
  const isFollowing = (id: string) => localFollow[id] ?? followingIds.has(id);
  const toggleFollow = (id: string) => {
    const cur = isFollowing(id);
    setLocalFollow((s) => ({ ...s, [id]: !cur }));
    if (cur) unfollowMutation.mutate(id);
    else followMutation.mutate(id);
  };

  const list: any[] = tab === "followers" ? followers?.items || [] : following?.items || [];
  const loading = tab === "followers" ? loadingFollowers : loadingFollowing;
  const filtered = query
    ? list.filter((u) =>
        `${u.name || ""} ${u.username || ""}`.toLowerCase().includes(query.toLowerCase()),
      )
    : list;

  const TABS: FollowListTab[] = ["followers", "following"];

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full-screen panel */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onTouchStart={onPanelTouchStart}
            onTouchEnd={onPanelTouchEnd}
            className="fixed inset-0 z-[295] bg-background flex flex-col overflow-hidden"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Top header: back arrow (left) + tab headers (right) */}
            <div className="flex items-center gap-2 px-2 h-14 shrink-0 border-b border-border/60">
              <button
                onClick={onClose}
                className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted-foreground/10 cursor-pointer"
                aria-label="Close"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="justify-content flex items-center gap-1 p-1 rounded-full bg-card/60 border border-border">
                {TABS.map((t) => {
                  const active = tab === t;
                  const count =
                    (t === "followers" ? followersCount : followingCount) ??
                    (t === "followers" ? followers?.meta?.total : following?.meta?.total);
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={cn(
                        "relative h-9 px-4 rounded-full text-sm font-semibold capitalize transition-colors cursor-pointer",
                        active
                          ? "text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="followTabPill"
                          className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/30"
                          transition={{ type: "spring", stiffness: 500, damping: 38 }}
                        />
                      )}
                      <span className="relative">
                        {typeof count === "number" ? `${count} ` : ""}
                        {t}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col w-full max-w-2xl mx-auto">
              {/* Search bar */}
              <div className="px-4 pt-3">
                <div className="flex items-center h-10 rounded-full bg-muted/60 px-4 focus-within:ring-1 focus-within:ring-primary/40">
                  <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none p-0"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="p-0.5 rounded-full hover:bg-muted-foreground/20 cursor-pointer"
                      aria-label="Clear"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-2 pt-2 pb-3 mt-1">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <Users className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {query
                        ? "No people found"
                        : tab === "followers"
                          ? "No followers yet"
                          : "Not following anyone yet"}
                    </p>
                  </div>
                ) : (
                  filtered.map((u) => {
                    const isSelf = u.id === ownProfile?.id;
                    const following = isFollowing(u.id);
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <button
                          onClick={() => onSelectUser?.(u.id)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/10">
                            <AvatarImage src={getAvatarUrl(u.avatar)} />
                            <AvatarFallback>
                              {(u.name || u.username || "?").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {u.name || u.username}
                              </span>
                              {u.isVerified && (
                                <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                          </div>
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => toggleFollow(u.id)}
                            className={cn(
                              "h-9 px-4 rounded-full text-sm font-semibold shrink-0 transition-colors cursor-pointer",
                              following
                                ? "bg-muted text-foreground hover:bg-muted/70"
                                : "bg-primary text-primary-foreground hover:bg-primary/90",
                            )}
                          >
                            {following ? "Following" : "Follow"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
