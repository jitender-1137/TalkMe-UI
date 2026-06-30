"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUrlModal } from "@/lib/navigation/use-url-modal";
import { ProfileViewsPage } from "./profile-views-page";

/**
 * Standalone "Who viewed your profile" modal — opened from the Chats header.
 * Wraps {@link ProfileViewsPage} (which loads the list and clears the badge on open).
 * Sits below the user-profile modal (z-[250]) so tapping a viewer stacks on top.
 */
export function ProfileViewsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  // Registers the hash segment + makes the browser Back button close the modal.
  useUrlModal(isOpen, onClose, "profile-views");

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[210] bg-black/40 backdrop-blur-xs"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="fixed top-0 right-0 z-[220] h-full w-full sm:w-[400px] bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="sticky top-0 z-10 flex items-center gap-1 px-2 py-2.5 bg-background/85 backdrop-blur-md border-b border-border shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Back"
                className="h-10 w-10 rounded-full text-foreground hover:bg-muted active:scale-95"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold text-foreground">Profile Views</h2>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <ProfileViewsPage />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
