"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  /** Bold title line (the question). */
  title: string;
  /** Optional supporting line below the title. */
  message?: string;
  /** Label for the confirming action. Default "OK". */
  confirmText?: string;
  /** Label for the dismissing action. Default "Cancel". */
  cancelText?: string;
  /** Render the confirm action in red (delete/logout etc.). */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Imperative iOS-style confirmation alert.
 *
 *   const confirm = useConfirm()
 *   if (await confirm({ title: "Log out?", confirmText: "Log Out", destructive: true })) { ... }
 *
 * A drop-in, promise-based replacement for the browser's native `window.confirm`,
 * rendered as a native-feeling iOS alert (centered, spring pop-in, hairline-split
 * actions, haptics) with focus trap + restore for accessibility.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}

interface DialogState extends ConfirmOptions {
  open: boolean;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({ open: false, title: "" });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const msgId = useId();

  useEffect(() => setMounted(true), []);

  const confirm = useCallback<ConfirmFn>((options) => {
    // Supersede any still-pending request (resolve it false) so its awaiter never
    // hangs if confirm() is called again before the previous one is dismissed.
    resolverRef.current?.(false);
    // Remember what had focus so we can restore it on close (a11y).
    triggerRef.current = (typeof document !== "undefined"
      ? (document.activeElement as HTMLElement | null)
      : null);
    haptic("warning");
    setState({ ...options, open: true });
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    haptic(result ? "impactMedium" : "selection");
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState((prev) => ({ ...prev, open: false }));
    // Restore focus to the element that opened the dialog.
    triggerRef.current?.focus?.();
    triggerRef.current = null;
  }, []);

  // While open: Escape cancels, and focus is moved into the dialog (cancel button).
  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(false);
    };
    window.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [state.open, settle]);

  // Safety: if the provider unmounts with a pending promise, resolve it false.
  useEffect(() => {
    return () => resolverRef.current?.(false);
  }, []);

  // Keep Tab focus inside the dialog (simple two-button trap).
  const handleTrapKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>("button");
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const overlay = (
    <AnimatePresence>
      {state.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => settle(false)}
          className="fixed inset-0 z-[400] flex items-center justify-center px-9 bg-black/40 backdrop-blur-[2px]"
          style={{ paddingTop: "var(--sat)", paddingBottom: "var(--sab)" }}
        >
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-label={state.title}
            aria-describedby={state.message ? msgId : undefined}
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={spring.snappy}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleTrapKey}
            className="w-full max-w-[270px] overflow-hidden rounded-[14px] glass-card border border-border/40 shadow-2xl text-center"
          >
            <div className="px-4 pt-5 pb-4">
              <h2 className="text-[17px] font-semibold leading-tight text-foreground">
                {state.title}
              </h2>
              {state.message && (
                <p
                  id={msgId}
                  className="mt-1.5 text-[13px] leading-snug text-muted-foreground whitespace-pre-line"
                >
                  {state.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 border-t border-border/60 divide-x divide-border/60">
              <button
                type="button"
                onClick={() => settle(false)}
                className="h-11 text-[17px] text-primary font-normal active:bg-foreground/10 transition-colors"
              >
                {state.cancelText ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                aria-label={
                  state.destructive
                    ? `${state.confirmText ?? "OK"} (destructive action)`
                    : undefined
                }
                className={cn(
                  "h-11 text-[17px] font-semibold active:bg-foreground/10 transition-colors",
                  state.destructive ? "text-destructive" : "text-primary",
                )}
              >
                {state.confirmText ?? "OK"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {mounted && createPortal(overlay, document.body)}
    </ConfirmContext.Provider>
  );
}
