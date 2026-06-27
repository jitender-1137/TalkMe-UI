"use client";

import React, { useRef, useState, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useScrollRestore } from "@/lib/navigation/scroll-restore";

export interface FilterChip {
  id: string;
  label: string;
  badge?: number;
}

export interface AppLayoutProps {
  title: string;
  logo?: string;
  icon?: React.ComponentType<{ className?: string }>;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterChips?: FilterChip[];
  activeFilterId?: string;
  onFilterChange?: (id: string) => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  collapseFiltersToHeader?: boolean;
  disableBottomPadding?: boolean;
  textSize?: string;
  /** When provided, enables pull-to-refresh on the scroll container (mobile). */
  onRefresh?: () => Promise<void> | void;
  /** Custom leading badge node (replaces the icon/logo image in the expanded title). */
  logoNode?: React.ReactNode;
  /** Decorative element rendered behind the expanded title row. */
  headerBackdrop?: React.ReactNode;
  /** Optional one-line tagline under the title. */
  subtitle?: React.ReactNode;
  /** Pin the header static (no scroll-driven collapse / shrink animation). */
  disableCollapse?: boolean;
  /** Control rendered to the right of the search bar (e.g. a filter button). */
  searchRight?: React.ReactNode;
  /** Toggle the search bar's visibility (defaults to shown when search exists). */
  showSearchBar?: boolean;
  /** Autofocus the search input when it appears (for toggle-to-open search). */
  searchAutoFocus?: boolean;
  /**
   * Stable key for preserving/restoring this layout's scroll position across
   * tab switches (e.g. "tab:chats"). When set, the scroll container also locks
   * while a modal/overlay is open so the background can't scroll behind it.
   */
  scrollKey?: string;
}

export function SearchSection({
  placeholder = "Search",
  value = "",
  onChange,
  trailing,
  autoFocus,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
  /** Optional control rendered to the right of the search pill. */
  trailing?: React.ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative w-full px-4 py-2 shrink-0 flex items-center gap-2">
      <div className="relative flex flex-1 items-center bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-full px-4 py-2 transition-all focus-within:bg-black/10 dark:focus-within:bg-white/10 h-10">
        <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground text-foreground border-none p-0 outline-none"
        />
        {value && (
          <button
            onClick={() => onChange?.("")}
            className="p-0.5 rounded-full hover:bg-muted-foreground/25 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      {trailing}
    </div>
  );
}

export function FilterChipBar({
  chips = [],
  activeId = "",
  onChange,
  textSize = "text-xs",
}: {
  chips?: FilterChip[];
  activeId?: string;
  onChange?: (id: string) => void;
  textSize?: string;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto flex items-center gap-1.5 px-4 py-2 select-none shrink-0 scrollbar-none",
        textSize !== "text-xs" && "justify-center gap-12",
      )}
    >
      {chips.map((chip) => {
        const isActive = activeId === chip.id;
        return (
          <button
            key={chip.id}
            onClick={() => onChange?.(chip.id)}
            className={cn(
              "relative shrink-0 font-semibold h-9 px-3.5 rounded-full border transition-colors active:scale-95 flex items-center gap-1.5 cursor-pointer",
              textSize,
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/60 text-muted-foreground border-border hover:text-foreground",
            )}
          >
            {chip.label}
            {chip.badge !== undefined && (
              <span
                className={cn(
                  "h-5 min-w-5 px-1 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                  isActive ? "bg-primary-foreground/20" : "bg-muted-foreground/15 text-foreground",
                )}
              >
                {chip.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AppLayout({
  title,
  logo,
  icon: Icon,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filterChips,
  activeFilterId,
  onFilterChange,
  headerRight,
  children,
  isLoading = false,
  collapseFiltersToHeader = false,
  disableBottomPadding = false,
  textSize = "text-xs",
  onRefresh,
  logoNode,
  headerBackdrop,
  subtitle,
  disableCollapse = false,
  searchRight,
  showSearchBar,
  searchAutoFocus,
  scrollKey,
}: AppLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Preserve scroll position across tab switches + lock the background while a
  // modal is open (no-op unless a scrollKey is supplied).
  useScrollRestore(containerRef, scrollKey ?? "", {
    lockWhenOverlay: true,
    enabled: !!scrollKey,
  });

  // ── Pull-to-refresh (mobile) ───────────────────────────────────────────────
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const PULL_THRESHOLD = 70;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onRefresh) return;

    const setDistance = (d: number) => {
      pullDistanceRef.current = d;
      setPullDistance(d);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0 && !isRefreshing) {
        pullStartY.current = e.touches[0].clientY;
      } else {
        pullStartY.current = null;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pullStartY.current == null || isRefreshing) return;
      const delta = e.touches[0].clientY - pullStartY.current;
      if (delta > 0 && el.scrollTop <= 0) {
        // Apply resistance so the pull feels rubber-bandy and capped.
        setDistance(Math.min(delta * 0.5, 90));
        if (e.cancelable) e.preventDefault();
      } else if (pullDistanceRef.current !== 0) {
        setDistance(0);
      }
    };
    const onTouchEnd = async () => {
      if (pullStartY.current == null) return;
      pullStartY.current = null;
      if (pullDistanceRef.current >= PULL_THRESHOLD && !isRefreshing) {
        setDistance(0);
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      } else {
        setDistance(0);
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
  }, [onRefresh, isRefreshing]);

  // Continuous scroll tracking using Framer Motion (runs outside React rendering context for 60fps)
  const { scrollY } = useScroll({ container: containerRef });

  // Collapsed sticky header overlays
  const headerBgOpacity = useTransform(scrollY, [0, 50], [0, 1]);
  const smallTitleOpacity = useTransform(scrollY, [35, 65], [0, 1]);
  const smallTitleY = useTransform(scrollY, [35, 65], [10, 0]);
  const pointerEvents = useTransform(scrollY, (value) => (value > 35 ? "auto" : "none"));

  // Expanded header animations
  const largeTitleOpacity = useTransform(scrollY, [0, 45], [1, 0]);
  const largeTitleScale = useTransform(scrollY, [-100, 0, 50], [1.1, 1, 0.9]);
  const largeTitleY = useTransform(scrollY, [-100, 0, 50], [10, 0, -10]);

  const hasSearch = onSearchChange !== undefined;
  const hasFilters = filterChips !== undefined && filterChips.length > 0;

  return (
    <div
      className={cn("relative h-full w-full flex flex-col overflow-hidden bg-background md:pb-0")}
    >
      {/* 1. STICKY COLLAPSED HEADER (Always fixed, background & small title fade in) */}
      {!disableCollapse && (
        <div className="fixed top-0 left-0 right-0 z-30 pointer-events-none md:left-18">
          {/* Blurred glass overlay */}
          <motion.div
            style={{ opacity: headerBgOpacity }}
            className="absolute inset-0 bg-background/90 dark:bg-black/90 backdrop-blur-[20px] border-b border-border/40 dark:border-white/5"
          />

          {/* Header content bar */}
          <motion.div
            style={{ pointerEvents }}
            className="relative flex items-center justify-between px-4 h-14 pt-[env(safe-area-inset-top)] w-full gap-4"
          >
            {/* Left section: Tab icon (theme color) and Header Title */}
            <motion.div
              style={{ opacity: smallTitleOpacity, y: smallTitleY }}
              className="flex items-center gap-2 shrink-0"
            >
              {Icon && <Icon className="h-5 w-5 text-primary shrink-0" />}
              <span className="font-bold text-base text-foreground tracking-tight select-none truncate max-w-25">
                {title}
              </span>
            </motion.div>

            {/* Middle section: Search bar (if search is supported on tab) */}
            <motion.div
              style={{ opacity: smallTitleOpacity }}
              className="flex-1 flex justify-center min-w-0"
            >
              {hasSearch && (
                <div className="w-full max-w-45 sm:max-w-xs">
                  <div className="relative flex items-center bg-black/10 dark:bg-white/10 border border-black/5 dark:border-white/5 rounded-full px-3 py-1 transition-all focus-within:bg-black/10 dark:focus-within:bg-white/10 h-8">
                    <Search className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0" />
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => onSearchChange?.(e.target.value)}
                      placeholder={searchPlaceholder || "Search..."}
                      className="w-full bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground text-foreground border-none p-0 outline-none"
                    />
                    {searchValue && (
                      <button
                        onClick={() => onSearchChange?.("")}
                        className="p-0.5 rounded-full hover:bg-muted-foreground/25 transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Right actions slot / Collapsed Filters */}
            <motion.div
              style={{ opacity: smallTitleOpacity }}
              className="flex items-center gap-2 shrink-0"
            >
              {collapseFiltersToHeader && filterChips ? (
                <div className="flex items-center gap-1.5 select-none">
                  {filterChips.map((chip) => {
                    const isActive = activeFilterId === chip.id;
                    return (
                      <button
                        key={chip.id}
                        onClick={() => onFilterChange?.(chip.id)}
                        className={cn(
                          "relative shrink-0 text-xl font-bold px-3 py-1 rounded-full transition-all duration-200 active:scale-95 flex items-center gap-1 cursor-pointer",
                          isActive
                            ? "bg-primary/15 dark:bg-primary/25 text-primary border border-primary/20"
                            : "bg-black/5 dark:bg-white/5 text-muted-foreground border border-transparent hover:text-foreground",
                        )}
                      >
                        {chip.label}
                        {chip.badge !== undefined && chip.badge > 0 && (
                          <span className="h-4 min-w-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1 shrink-0 bg-red-500 text-white ring-2 ring-background shadow-sm shadow-red-500/40">
                            {chip.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                headerRight
              )}
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* 2. SCROLLABLE CONTAINER (Content scrolls under the glass header) */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 flex flex-col",
          disableBottomPadding ? "overflow-hidden" : "overflow-y-auto overscroll-contain",
        )}
      >
        {/* Pull-to-refresh indicator */}
        {onRefresh && (pullDistance > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center overflow-hidden shrink-0 transition-[height] duration-150"
            style={{ height: isRefreshing ? 44 : pullDistance }}
          >
            <Loader2
              className={cn("h-5 w-5 text-primary", isRefreshing && "animate-spin")}
              style={{
                opacity: isRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1),
                transform: isRefreshing
                  ? undefined
                  : `rotate(${(pullDistance / PULL_THRESHOLD) * 270}deg)`,
              }}
            />
          </div>
        )}

        {/* Expanded State Header - Scrolls with content, transformations linked to scrollY */}
        <div
          className={cn(
            "flex flex-col shrink-0",
            disableCollapse && "sticky top-0 z-20 bg-background",
          )}
        >
          {/* Large Title Area (Logo + Title on the left, action buttons on the right - SAME ROW) */}
          <div className="relative overflow-hidden md:px-1 pr-1 pl-1 flex items-center justify-between min-h-21">
            {/* Decorative backdrop (opt-in) */}
            {headerBackdrop && (
              <div className="pointer-events-none absolute inset-0 z-0">{headerBackdrop}</div>
            )}
            <motion.div
              style={
                disableCollapse
                  ? { transformOrigin: "left center" }
                  : {
                      opacity: largeTitleOpacity,
                      scale: largeTitleScale,
                      y: largeTitleY,
                      transformOrigin: "left center",
                    }
              }
              className="relative z-10 flex items-center gap-3 select-none min-w-0"
            >
              {logoNode ? (
                <div className="shrink-0">{logoNode}</div>
              ) : (
                logo && (
                  <div className="flex items-center justify-center h-10 w-10 rounded-2xl overflow-hidden shadow-lg shadow-primary/25 shrink-0">
                    <img src={logo} alt={title} className="w-full h-full object-cover" />
                  </div>
                )
              )}
              <div className="min-w-0">
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{title}</h1>
                {subtitle && (
                  <p className="mt-0.5 text-sm text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            </motion.div>

            {/* Action buttons next to the title (fades out as scroller moves up) */}
            <motion.div
              style={disableCollapse ? undefined : { opacity: largeTitleOpacity, y: largeTitleY }}
              className="relative z-10 flex items-center gap-2"
            >
              {headerRight}
            </motion.div>
          </div>

          {/* Filter chips section */}
          {hasFilters && (
            <FilterChipBar
              chips={filterChips}
              activeId={activeFilterId}
              onChange={onFilterChange}
              textSize={textSize}
            />
          )}

          {/* Search bar section — sits below the tabs/filters, outside the banner */}
          {hasSearch && (showSearchBar ?? true) && (
            <SearchSection
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={onSearchChange}
              trailing={searchRight}
              autoFocus={searchAutoFocus}
            />
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 flex flex-col relative w-full mx-auto pb-0">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground select-none">Loading...</span>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
