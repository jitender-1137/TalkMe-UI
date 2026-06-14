"use client";

import { useEffect, useRef } from "react";

/**
 * A custom hook to synchronize an open/close UI state (like modals) with the URL hash.
 * Supports browser history back/forward events and back button synchronization.
 *
 * @param isOpen Whether the UI element (e.g. modal) is currently open.
 * @param onClose The callback to close the UI element state locally.
 * @param targetHash The URL hash that represents the open state (e.g. "#profile").
 * @param fallbackHash The URL hash to fall back to when closed (default is empty "").
 * @returns A safe close handler function that uses browser history back navigation when appropriate.
 */
export function useHashSync(
  isOpen: boolean,
  onClose: () => void,
  targetHash: string,
  fallbackHash: string = ""
) {
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Sync state to URL hash
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== "undefined" && window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    } else {
      if (typeof window !== "undefined" && window.location.hash === targetHash) {
        window.location.hash = fallbackHash;
      }
    }
  }, [isOpen, targetHash, fallbackHash]);

  // Sync URL hash back to state (e.g. browser back button)
  useEffect(() => {
    const handleHashChange = () => {
      if (
        typeof window !== "undefined" &&
        window.location.hash !== targetHash &&
        isOpenRef.current
      ) {
        onClose();
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [targetHash, onClose]);

  // Reusable close handler to align UI close buttons with browser history navigation
  const handleClose = () => {
    if (typeof window !== "undefined" && window.location.hash === targetHash) {
      window.history.back();
    } else {
      onClose();
    }
  };

  return handleClose;
}
