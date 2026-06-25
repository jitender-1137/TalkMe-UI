"use client";

import { motion } from "framer-motion";
import { Search, Bell, Sparkles, CheckCheck, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  HEADER_ICON_BTN,
  HEADER_ICON_BTN_ACTIVE,
  HEADER_ICON,
} from "@/components/ui/header-button";
import { useNotifications, useMarkAllNotificationsRead } from "@/src/api/hooks/useNotifications";

export interface NewsTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NewsHeaderProps {
  /** Tab-specific description shown under the title. */
  subtitle?: string;
  searchOpen: boolean;
  onSearchToggle: () => void;
}

/** Decorative green night-sky scene tucked behind the header: glowing crescent
 *  moon, twinkling stars, a shooting star, sparkles and a pine-tree skyline. */
function NightSky() {
  const stars: [number, number, number][] = [
    [60, 30, 1.4],
    [110, 18, 1],
    [150, 64, 1.2],
    [205, 26, 1.3],
    [250, 60, 1],
    [300, 22, 1.2],
    [340, 50, 1.4],
    [90, 70, 0.9],
    [270, 90, 1],
    [180, 38, 0.9],
  ];
  return (
    <svg
      viewBox="0 0 380 120"
      aria-hidden
      className="pointer-events-none absolute right-0 top-0 h-30 w-95 max-w-[70%] opacity-75"
    >
      <defs>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.7 0.18 150)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="oklch(0.7 0.18 150)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="newsShoot" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.92 0.06 150)" stopOpacity="0" />
          <stop offset="100%" stopColor="oklch(0.92 0.06 150)" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* moon glow + crescent */}
      <circle cx="300" cy="44" r="40" fill="url(#moonGlow)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="5s" repeatCount="indefinite" />
      </circle>
      <path d="M308 24a22 22 0 1 0 0 44 18 18 0 0 1 0-44z" fill="oklch(0.8 0.16 150)" />

      {/* twinkling stars */}
      {stars.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="oklch(0.88 0.05 150)">
          <animate
            attributeName="opacity"
            values="0.35;1;0.35"
            dur={`${2 + (i % 3)}s`}
            begin={`${i * 0.25}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* 4-point sparkle */}
      <path
        d="M150 96 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z"
        fill="oklch(0.92 0.06 150)"
        fillOpacity="0.85"
      />

      {/* shooting star — sweeps across on a loop */}
      <g>
        <line
          x1="0"
          y1="0"
          x2="56"
          y2="16"
          stroke="url(#newsShoot)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="56" cy="16" r="1.8" fill="oklch(0.96 0.03 150)" />
        <animateTransform
          attributeName="transform"
          type="translate"
          values="20 18; 150 50; 200 64"
          keyTimes="0;0.7;1"
          dur="6s"
          begin="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          keyTimes="0;0.1;0.7;1"
          dur="6s"
          begin="2s"
          repeatCount="indefinite"
        />
      </g>

      {/* pine-tree skyline */}
      {[300, 322, 344, 366].map((x, i) => (
        <path
          key={i}
          d={`M${x} 120 L${x - 11} 120 L${x} ${92 - (i % 2) * 6} L${x + 11} 120 Z`}
          fill="oklch(0.35 0.09 150)"
        />
      ))}
    </svg>
  );
}

export function NewsHeader({ subtitle, searchOpen, onSearchToggle }: NewsHeaderProps) {
  const { data: notifications = [] } = useNotifications();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="bg-background dark:bg-black">
      <div className="relative px-4 md:px-6 pt-2 pb-3 overflow-hidden pr-1 pl-4 py-2 flex items-center justify-between">
        {/* Decorative animated night-sky background */}
        <NightSky />

        {/* Title row */}
        <div className="relative flex items-center justify-between gap-3 h-21">
          <div className="flex items-center gap-3 min-w-0">
            {/* Leading icon badge (consistent with the other tabs) */}
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 border border-primary/20">
                <Newspaper className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-3xl leading-none font-extrabold tracking-tight text-foreground">
                News
                <Sparkles className="h-5 w-5 text-primary fill-primary/30" />
              </h1>
              {subtitle && (
                <p className="mt-1.5 max-w-60 text-sm leading-snug text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onSearchToggle}
              aria-label="Search feed"
              className={cn(HEADER_ICON_BTN, searchOpen && HEADER_ICON_BTN_ACTIVE)}
            >
              <Search className={HEADER_ICON} />
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <button aria-label="Notifications" className={cn(HEADER_ICON_BTN, "relative")}>
                  <Bell className={HEADER_ICON} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-80 p-0 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-semibold text-sm text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <Bell className="h-7 w-7 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">You're all caught up</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "flex gap-3 px-4 py-3 border-b border-border/50 last:border-0",
                          !n.isRead && "bg-primary/5",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 rounded-full shrink-0",
                            n.isRead ? "bg-transparent" : "bg-primary",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </header>
  );
}

interface NewsTabsProps {
  tabs: NewsTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

/** Segmented Feed / Explore / Profile pills — rendered OUTSIDE the header. */
export function NewsTabs({ tabs, activeTab, onTabChange }: NewsTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-card/60 border border-border">
      {tabs.map((tab, i) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 h-10 rounded-full text-sm font-semibold transition-colors cursor-pointer",
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              !isActive &&
                i > 0 &&
                activeTab !== tabs[i - 1].id &&
                "before:absolute before:left-0 before:h-5 before:w-px before:bg-border/70",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="newsTabPill"
                className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/30"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon className="h-4.5 w-4.5" />
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
