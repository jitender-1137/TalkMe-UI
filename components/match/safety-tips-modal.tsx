"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShieldCheck,
  Smile,
  Ban,
  Lock,
  DoorOpen,
  MessageCircle,
  UserPlus,
  Sparkles,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SafetyTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the user agrees and taps "I'm Ready to Connect". */
  onReady?: () => void;
}

const TIPS = [
  {
    icon: Smile,
    title: "Be Respectful",
    desc: "Treat others the way you want to be treated.",
  },
  {
    icon: Ban,
    title: "No Inappropriate Content",
    desc: "Don't share anything offensive, sexual or harmful.",
  },
  {
    icon: Lock,
    title: "No Personal Info",
    desc: "Don't share your personal information.",
  },
  {
    icon: DoorOpen,
    title: "You Can Leave Anytime",
    desc: "If you feel uncomfortable, you can leave anytime.",
  },
];

export function SafetyTipsModal({ isOpen, onClose, onReady }: SafetyTipsModalProps) {
  const [agreed, setAgreed] = useState(false);

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[290] bg-black/60 backdrop-blur-sm"
          />

          {/* Panel — bottom sheet on mobile, centered card on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed z-[295] inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl
                       sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[420px] sm:max-h-[88vh]
                       sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl
                       bg-background border border-border shadow-2xl flex flex-col overflow-hidden
                       pb-[env(safe-area-inset-bottom)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-lg font-bold text-foreground">Before You Connect</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="h-9 w-9 -mr-1 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted-foreground/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {/* Shield hero */}
              <div className="relative flex flex-col items-center pt-4 pb-3">
                <span className="absolute top-2 left-6 flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border text-primary/80">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <span className="absolute top-1 right-6 flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border text-amber-400">
                  <Lock className="h-4 w-4" />
                </span>
                <span className="absolute top-16 right-9 flex h-8 w-8 items-center justify-center rounded-xl bg-card border border-border text-primary/80">
                  <UserPlus className="h-4 w-4" />
                </span>
                <Sparkles className="absolute top-3 left-1/3 h-4 w-4 text-primary/60" />
                <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-primary/30 blur-xl" />
                  <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-emerald-600 shadow-lg shadow-primary/40">
                    <ShieldCheck className="h-10 w-10 text-white" />
                  </span>
                </div>
                <p className="mt-4 text-center text-sm text-muted-foreground max-w-[16rem]">
                  Please read and understand these important points.
                </p>
              </div>

              {/* Tips */}
              <div className="rounded-2xl border border-border/60 bg-card/50 divide-y divide-border/40">
                {TIPS.map((tip) => {
                  const Icon = tip.icon;
                  return (
                    <div key={tip.title} className="flex items-start gap-3 p-3.5">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                          {tip.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Agree checkbox */}
              <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={agreed}
                  onClick={() => setAgreed((v) => !v)}
                  className={cn(
                    "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0",
                    agreed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50",
                  )}
                >
                  {agreed && <Check className="h-3.5 w-3.5" />}
                </button>
                <span className="text-sm text-foreground">I understand and agree</span>
              </label>
            </div>

            {/* CTA */}
            <div className="px-5 pt-2 pb-5">
              <button
                disabled={!agreed}
                onClick={() => {
                  onReady?.();
                  onClose();
                }}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 active:scale-[0.99] transition-all cursor-pointer"
              >
                I'm Ready to Connect
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
