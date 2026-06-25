"use client";

import { motion } from "framer-motion";
import { Search, List, LayoutGrid, ChevronLeft } from "lucide-react";
import { cn, getAvatarUrl } from "@/lib/utils";
import {
  HEADER_ICON_BTN,
  HEADER_ICON_BTN_ACTIVE,
  HEADER_ICON,
} from "@/components/ui/header-button";

export interface FriendsTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface FriendsHeaderProps {
  subtitle: string;
  /** Optional leading badge icon (omitted on the Requests variant). */
  leadingIcon?: React.ComponentType<{ className?: string }>;
  /** Decorative backdrop style per tab. */
  decoration?: "network" | "aurora";
  /** Show the search-toggle icon (hidden e.g. on the Requests tab). */
  showSearch?: boolean;
  searchOpen: boolean;
  onSearchToggle: () => void;
  /** List / card view toggle (All Friends only). */
  view?: "list" | "grid";
  onViewChange?: (view: "list" | "grid") => void;
  /** Optional Back affordance (shown when Friends is opened from another tab). */
  onBack?: () => void;
  onAddFriend: () => void;
  onSettings: () => void;
  /** A couple of friend avatars to float in the decorative network. */
  avatars?: string[];
}

/** Flowing green→purple aurora light-streak (Requests variant). */
function AuroraStreak() {
  return (
    <svg
      viewBox="0 0 900 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="aurora-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.78 0.2 150)" stopOpacity="0" />
          <stop offset="40%" stopColor="oklch(0.8 0.2 150)" />
          <stop offset="70%" stopColor="oklch(0.7 0.22 320)" />
          <stop offset="100%" stopColor="oklch(0.6 0.22 320)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="aurora-green" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.8 0.2 150)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="oklch(0.8 0.2 150)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="aurora-purple" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.65 0.24 320)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="oklch(0.65 0.24 320)" stopOpacity="0" />
        </radialGradient>
        <filter id="aurora-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      {/* soft glows */}
      <ellipse
        cx="430"
        cy="110"
        rx="150"
        ry="70"
        fill="url(#aurora-green)"
        filter="url(#aurora-blur)"
      />
      <ellipse
        cx="600"
        cy="120"
        rx="150"
        ry="70"
        fill="url(#aurora-purple)"
        filter="url(#aurora-blur)"
      />
      {/* flowing filaments */}
      <g fill="none" stroke="url(#aurora-stroke)" strokeLinecap="round">
        <path d="M360 150 C 480 60, 560 70, 720 130" strokeWidth="3" strokeOpacity="0.9" />
        <path d="M380 165 C 500 80, 580 95, 760 140" strokeWidth="2" strokeOpacity="0.7" />
        <path d="M400 135 C 500 70, 600 60, 700 110" strokeWidth="1.5" strokeOpacity="0.6" />
        <path d="M420 175 C 520 110, 600 120, 740 160" strokeWidth="1" strokeOpacity="0.5" />
      </g>
    </svg>
  );
}

/** Decorative "social graph": people-nodes joined by edges, a pulsing link,
 *  glowing dots, a couple of hearts and scattered stars. */
function ConnectionsNetwork() {
  // Network nodes (people) — edges drawn between selected pairs.
  const nodes: [number, number, number][] = [
    [180, 70, 7],
    [320, 130, 9],
    [470, 60, 6],
    [600, 120, 8],
    [700, 50, 7],
    [820, 110, 6],
  ];
  const edges: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [2, 4],
  ];
  return (
    <svg
      viewBox="0 0 900 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
    >
      <defs>
        <radialGradient id="fdot-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.72 0.18 150)" />
          <stop offset="100%" stopColor="oklch(0.72 0.18 150)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fdot-p" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.7 0.2 300)" />
          <stop offset="100%" stopColor="oklch(0.7 0.2 300)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fnode" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="oklch(0.82 0.16 160)" />
          <stop offset="100%" stopColor="oklch(0.55 0.18 280)" />
        </radialGradient>
      </defs>

      {/* sweeping link lines (background) */}
      <g stroke="oklch(0.7 0.05 280)" strokeOpacity="0.16" strokeWidth="1" fill="none">
        <path d="M120 60 Q 320 20 520 70 T 860 50" />
        <path d="M80 150 Q 300 175 560 125 T 890 155" />
      </g>

      {/* social-graph edges */}
      <g stroke="oklch(0.78 0.12 165)" strokeOpacity="0.3" strokeWidth="1.4">
        {edges.map(([a, b], i) => (
          <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
        ))}
      </g>

      {/* glow halos */}
      <circle cx="640" cy="40" r="12" fill="url(#fdot-g)" />
      <circle cx="300" cy="150" r="10" fill="url(#fdot-p)" />
      <circle cx="820" cy="120" r="9" fill="url(#fdot-g)" />

      {/* signal packets travelling along the links */}
      <circle r="2.6" fill="oklch(0.92 0.12 165)">
        <animateMotion path="M470 60 L600 120 L700 50 L820 110" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle r="2.2" fill="oklch(0.92 0.12 165)" fillOpacity="0.8">
        <animateMotion
          path="M180 70 L320 130 L470 60"
          dur="5s"
          begin="1.5s"
          repeatCount="indefinite"
        />
      </circle>

      {/* person-nodes (pulsing) */}
      {nodes.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="url(#fnode)" fillOpacity="0.85" />
          <circle cx={x} cy={y} r={r} fill="none" stroke="oklch(0.88 0.1 160)" strokeOpacity="0.4">
            <animate
              attributeName="r"
              values={`${r};${r + 6};${r}`}
              dur={`${2.4 + (i % 3) * 0.5}s`}
              begin={`${i * 0.35}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-opacity"
              values="0.45;0;0.45"
              dur={`${2.4 + (i % 3) * 0.5}s`}
              begin={`${i * 0.35}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}

      {/* little hearts on the graph */}
      {[
        [540, 150],
        [760, 150],
      ].map(([x, y], i) => (
        <path
          key={i}
          d={`M${x} ${y} c -3 -6 -12 -4 -12 2 c 0 5 7 9 12 13 c 5 -4 12 -8 12 -13 c 0 -6 -9 -8 -12 -2 z`}
          fill="oklch(0.72 0.2 20)"
          fillOpacity="0.55"
        >
          <animate
            attributeName="fill-opacity"
            values="0.35;0.7;0.35"
            dur="2s"
            begin={`${i * 0.5}s`}
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 0 -7; 0 0"
            dur={`${4 + i}s`}
            repeatCount="indefinite"
          />
        </path>
      ))}

      {/* scattered stars */}
      {[
        [150, 40, 1.4],
        [430, 24, 1],
        [800, 36, 1.2],
        [380, 110, 1],
        [880, 90, 1.3],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="oklch(0.92 0.03 280)" fillOpacity="0.8" />
      ))}
    </svg>
  );
}

/** Floating friend avatars with glowing rings (decorative). */
function FloatingAvatars({ avatars }: { avatars: string[] }) {
  const list = avatars.slice(0, 2);
  if (list.length === 0) return null;
  const positions = [
    "left-[46%] top-1", // upper
    "left-[52%] top-12", // lower
  ];
  return (
    <>
      {list.map((src, i) => (
        <div
          key={i}
          className={cn(
            "pointer-events-none absolute h-11 w-11 rounded-full p-0.5 hidden sm:block",
            "bg-linear-to-tr from-primary/70 to-fuchsia-500/70 shadow-lg shadow-primary/30",
            positions[i],
          )}
        >
          <img
            src={getAvatarUrl(src)}
            alt=""
            className="h-full w-full rounded-full object-cover border border-background"
          />
        </div>
      ))}
    </>
  );
}

export function FriendsHeader({
  subtitle,
  leadingIcon: LeadingIcon,
  decoration = "network",
  showSearch = true,
  searchOpen,
  onSearchToggle,
  view,
  onViewChange,
  onBack,
  onAddFriend,
  onSettings,
  avatars = [],
}: FriendsHeaderProps) {
  return (
    <header className="bg-background dark:bg-black">
      <div className="relative px-4 md:px-6 pt-2 pb-3 overflow-hidden pr-1 pl-4 py-2 flex items-center justify-between">
        {/* Decorative backdrop */}
        {decoration === "aurora" ? (
          <AuroraStreak />
        ) : (
          <>
            <ConnectionsNetwork />
            <FloatingAvatars avatars={avatars} />
          </>
        )}

        {/* Title row */}
        <div className="relative z-10 flex items-center justify-between gap-3 h-21">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Back"
                className={cn(HEADER_ICON_BTN, "shrink-0")}
              >
                <ChevronLeft className={HEADER_ICON} />
              </button>
            )}
            {LeadingIcon && (
              <div className="relative shrink-0">
                {/* glow */}
                <span className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
                {/* orbit ring */}
                <span className="absolute -inset-1 rounded-full border border-primary/30" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 border border-primary/40">
                  <LeadingIcon className="h-6 w-6 text-primary" />
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-primary border-2 border-background" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-3xl leading-none font-extrabold tracking-tight text-foreground">
                Friends
              </h1>
              <p className="mt-1.5 max-w-60 text-sm leading-snug text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </div>

          {(showSearch || (view && onViewChange)) && (
            <div className="flex items-center gap-2 shrink-0">
              {/* List / Card view toggle (left of the search button) */}
              {view && onViewChange && (
                <div className="shrink-0 flex items-center gap-0.5 p-0.5 rounded-full border border-border bg-card/60">
                  <button
                    onClick={() => onViewChange("list")}
                    aria-label="List view"
                    className={cn(
                      "h-8 w-8 flex items-center justify-center rounded-full transition-colors cursor-pointer",
                      view === "list"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onViewChange("grid")}
                    aria-label="Card view"
                    className={cn(
                      "h-8 w-8 flex items-center justify-center rounded-full transition-colors cursor-pointer",
                      view === "grid"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              )}
              {showSearch && (
                <button
                  onClick={onSearchToggle}
                  aria-label="Search"
                  className={cn(HEADER_ICON_BTN, searchOpen && HEADER_ICON_BTN_ACTIVE)}
                >
                  <Search className={HEADER_ICON} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

interface FriendsTabsProps {
  tabs: FriendsTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

/** Segmented All Friends / Requests pills — rendered OUTSIDE the header. */
export function FriendsTabs({ tabs, activeTab, onTabChange }: FriendsTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-card/60 border border-border">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 h-10 rounded-full text-sm font-semibold transition-colors cursor-pointer",
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="friendsTabPill"
                className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/30"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon className="h-4.5 w-4.5" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={cn(
                    "h-5 min-w-5 px-1 flex items-center justify-center rounded-full text-[10px] font-bold",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
