"use client";

import React, { useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

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
}

export function SearchSection({
  placeholder = "Search",
  value = "",
  onChange,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
}) {
  return (
    <div className="relative w-full px-4 py-2 shrink-0">
      <div className="relative flex items-center bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-full px-4 py-2 transition-all focus-within:bg-black/10 dark:focus-within:bg-white/10 h-10">
        <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
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
    </div>
  );
}

export function FilterChipBar({
  chips = [],
  activeId = "",
  onChange,
}: {
  chips?: FilterChip[];
  activeId?: string;
  onChange?: (id: string) => void;
}) {
  return (
    <div className="w-full overflow-x-auto flex items-center gap-2 px-4 py-2 select-none shrink-0 scrollbar-none">
      {chips.map((chip) => {
        const isActive = activeId === chip.id;
        return (
          <button
            key={chip.id}
            onClick={() => onChange?.(chip.id)}
            className={cn(
              "relative shrink-0 text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer",
              isActive
                ? "bg-primary/15 dark:bg-primary/25 text-primary border border-primary/20"
                : "bg-black/5 dark:bg-white/5 text-muted-foreground border border-transparent hover:text-foreground",
            )}
          >
            {chip.label}
            {chip.badge !== undefined && chip.badge > 0 && (
              <span
                className={cn(
                  "h-4 min-w-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1 shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-black/10 dark:bg-white/10 text-muted-foreground",
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
}: AppLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
      className={cn(
        "relative h-full w-full flex flex-col overflow-hidden bg-background md:pb-0",
        disableBottomPadding ? "pb-0" : "pb-[calc(env(safe-area-inset-bottom)+76px)]",
      )}
    >
      {/* 1. STICKY COLLAPSED HEADER (Always fixed, background & small title fade in) */}
      <div className="fixed top-0 left-0 right-0 z-30 pointer-events-none md:left-[72px]">
        {/* Blurred glass overlay */}
        <motion.div
          style={{ opacity: headerBgOpacity }}
          className="absolute inset-0 bg-background/80 dark:bg-black/55 backdrop-blur-[20px] border-b border-border/40 dark:border-white/5"
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
            <span className="font-bold text-base text-foreground tracking-tight select-none truncate max-w-[100px]">
              {title}
            </span>
          </motion.div>

          {/* Middle section: Search bar (if search is supported on tab) */}
          <motion.div
            style={{ opacity: smallTitleOpacity }}
            className="flex-1 flex justify-center min-w-0"
          >
            {hasSearch && (
              <div className="w-full max-w-[180px] sm:max-w-xs">
                <div className="relative flex items-center bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-full px-3 py-1 transition-all focus-within:bg-black/10 dark:focus-within:bg-white/10 h-8">
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
                        "relative shrink-0 text-[10px] font-bold px-3 py-1 rounded-full transition-all duration-200 active:scale-95 flex items-center gap-1 cursor-pointer",
                        isActive
                          ? "bg-primary/15 dark:bg-primary/25 text-primary border border-primary/20"
                          : "bg-black/5 dark:bg-white/5 text-muted-foreground border border-transparent hover:text-foreground",
                      )}
                    >
                      {chip.label}
                      {chip.badge !== undefined && chip.badge > 0 && (
                        <span
                          className={cn(
                            "h-3.5 min-w-3.5 flex items-center justify-center rounded-full text-[8px] font-bold px-0.5 shrink-0",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-black/10 dark:bg-white/10 text-muted-foreground",
                          )}
                        >
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

      {/* 2. SCROLLABLE CONTAINER (Content scrolls under the glass header) */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 flex flex-col",
          disableBottomPadding ? "overflow-hidden" : "overflow-y-auto overscroll-contain",
        )}
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
        }}
      >
        {/* Expanded State Header - Scrolls with content, transformations linked to scrollY */}
        <div className="flex flex-col pb-2 shrink-0">
          {/* Large Title Area (Logo + Title on the left, action buttons on the right - SAME ROW) */}
          <div className="px-6 py-2 flex items-center justify-between min-h-[52px]">
            <motion.div
              style={{
                opacity: largeTitleOpacity,
                scale: largeTitleScale,
                y: largeTitleY,
                transformOrigin: "left center",
              }}
              className="flex items-center gap-3 select-none"
            >
              {logo && (
                <div className="flex items-center justify-center h-10 w-10 rounded-2xl overflow-hidden shadow-lg shadow-primary/25 shrink-0">
                  <img src={logo} alt={title} className="w-full h-full object-cover" />
                </div>
              )}
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{title}</h1>
            </motion.div>

            {/* Action buttons next to the title (fades out as scroller moves up) */}
            <motion.div
              style={{
                opacity: largeTitleOpacity,
                y: largeTitleY,
              }}
              className="flex items-center gap-2"
            >
              {headerRight}
            </motion.div>
          </div>

          {/* Search bar section */}
          {hasSearch && (
            <SearchSection
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={onSearchChange}
            />
          )}

          {/* Filter chips section */}
          {hasFilters && (
            <FilterChipBar
              chips={filterChips}
              activeId={activeFilterId}
              onChange={onFilterChange}
            />
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 flex flex-col relative">
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
