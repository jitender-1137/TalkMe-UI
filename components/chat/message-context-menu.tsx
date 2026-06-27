"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Reply,
  Copy,
  Trash2,
  Forward,
  Info,
  Star,
  MoreHorizontal,
  SmilePlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MessageContextMenuProps {
  isOpen: boolean;
  isSent: boolean;
  isMobile: boolean;
  /** Pixel position for desktop floating menu */
  position?: { x: number; y: number };
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onForward: () => void;
  onReact: (emoji?: string) => void;
  onPin: () => void;
  onInfo: () => void;
}

const EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

export function MessageContextMenu({
  isOpen,
  isSent,
  isMobile,
  position,
  onClose,
  onReply,
  onCopy,
  onDelete,
  onForward,
  onReact,
  onPin,
  onInfo,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click (desktop)
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, isMobile, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Close on right-click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (e.button === 2) {
        // Right-click button
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  const actions = [
    { icon: Reply, label: "Reply", action: onReply, danger: false },
    { icon: Forward, label: "Forward", action: onForward, danger: false },
    { icon: Copy, label: "Copy", action: onCopy, danger: false },
    { icon: Info, label: "Info", action: onInfo, danger: false },
    { icon: Star, label: "Star", action: onPin, danger: false },
    { icon: Trash2, label: "Delete", action: onDelete, danger: true },
    {
      icon: MoreHorizontal,
      label: "More...",
      action: () => toast.info("More options"),
      danger: false,
    },
  ];

  // ---- MOBILE: bottom-sheet ----
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              className="fixed inset-0 z-[200] bg-black/40"
            />

            {/* Bottom sheet */}
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[201] bg-card rounded-t-3xl pb-safe border-t border-white/10"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Quick emoji reactions */}
              <div className="flex items-center justify-around px-6 py-3 border-b border-white/10">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(emoji);
                      onClose();
                    }}
                    className="text-2xl p-2 hover:scale-125 transition-transform active:scale-95 rounded-full active:bg-white/10"
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={() => {
                    onReact();
                    onClose();
                  }}
                  className="p-2 hover:scale-125 transition-transform rounded-full active:bg-white/10"
                  aria-label="More reactions"
                >
                  <SmilePlus className="h-6 w-6 text-muted-foreground" />
                </button>
              </div>

              {/* Actions */}
              <div className="px-2 py-2">
                {actions.map(({ icon: Icon, label, action, danger }) => (
                  <button
                    key={label}
                    onClick={() => {
                      action();
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98] active:bg-white/5",
                      danger ? "text-destructive" : "text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-base font-medium">{label}</span>
                  </button>
                ))}
              </div>

              {/* Cancel */}
              <div className="px-2 pb-4">
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-muted text-foreground font-medium transition-all active:scale-[0.98]"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // ---- DESKTOP: floating menu with viewport bounds checking ----
  const getAdjustedPosition = () => {
    const menuWidth = 240;
    const menuHeight = actions.length * 45 + 10; // approximate height with padding
    const padding = 12;

    let adjustedX = position?.x ?? 0;
    let adjustedY = position?.y ?? 0;

    // Adjust horizontal position if menu goes off-screen
    if (adjustedX + menuWidth + padding > window.innerWidth) {
      adjustedX = window.innerWidth - menuWidth - padding;
    }
    if (adjustedX < padding) {
      adjustedX = padding;
    }

    // Adjust vertical position - try showing below first, then above if needed
    const spaceBelow = window.innerHeight - adjustedY;
    const spaceAbove = adjustedY;

    if (spaceBelow >= menuHeight + padding) {
      // Enough space below - show menu below the click
      adjustedY = adjustedY;
    } else if (spaceAbove >= menuHeight + padding) {
      // Not enough space below but enough above - show menu above
      adjustedY = adjustedY - menuHeight - 5;
    } else {
      // Not enough space either way - prioritize showing above the click
      adjustedY = Math.max(padding, adjustedY - menuHeight - 5);
    }

    // Final clamp to ensure menu stays within viewport
    adjustedY = Math.max(padding, Math.min(adjustedY, window.innerHeight - menuHeight - padding));

    return { x: adjustedX, y: adjustedY };
  };

  const adjustedPos = getAdjustedPosition();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop-desk"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200]"
          />
          <motion.div
            key="menu-desk"
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.13 }}
            style={{ top: adjustedPos.y, left: adjustedPos.x }}
            className="fixed z-[201] min-w-[240px] bg-popover border border-white/10 rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Action list with divider */}
            <div>
              {actions.map(({ icon: Icon, label, action, danger }, index) => (
                <div key={label}>
                  <button
                    onClick={() => {
                      action();
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-white/10 transition-colors",
                      danger ? "text-destructive hover:bg-destructive/10" : "text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                  {index === 4 && <div className="h-px bg-white/10 my-0" />}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
