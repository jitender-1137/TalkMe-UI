"use client";

import {
  ChevronRight,
  MessageSquareText,
  MessageSquare,
  FileText,
  ShieldCheck,
  Info,
} from "lucide-react";
import type { InfoPage } from "@/components/app-shell/info-pages";

interface HelpPageProps {
  /** Open one of the legal/info modals. */
  onOpenLegal: (page: InfoPage) => void;
}

const FAQS = [
  {
    q: "How does Quick Match work?",
    a: "Quick Match instantly and anonymously connects you with another person. Your identity is never shared with your match.",
  },
  {
    q: "Who can see when I'm online?",
    a: "You control this from Privacy. Enable Invisible mode to always appear offline, or hide your last seen.",
  },
  {
    q: "How do I report someone?",
    a: "Open the chat, tap the menu, and choose Report. Our team reviews reports alongside AI moderation.",
  },
];

/** #profile/help-and-feedback — FAQs, support, and links to legal pages. */
export function HelpPage({ onOpenLegal }: HelpPageProps) {
  const rowClass =
    "px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-muted/20 active:bg-muted/40 transition-colors";

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto text-left">
      <div className="p-4 rounded-lg border border-border bg-card/40">
        <h3 className="text-sm font-semibold text-foreground mb-1">How can we help?</h3>
        <p className="text-xs text-muted-foreground">
          Find quick answers, contact support, or share feedback.
        </p>
      </div>

      {/* FAQs */}
      <div className="bg-card rounded-[18px] overflow-hidden border border-border divide-y divide-border/50">
        {FAQS.map((item, i) => (
          <details key={i} className="group px-4 py-3.5">
            <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-medium text-foreground">
              {item.q}
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>

      {/* Actions */}
      <div className="bg-card rounded-[18px] overflow-hidden border border-border divide-y divide-border/50">
        <div onClick={() => onOpenLegal("contact-us")} className={rowClass}>
          <div className="flex items-center gap-3.5 text-foreground">
            <MessageSquareText className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Contact us</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <a
          href="mailto:support@talkme.app?subject=Problem%20report&body=Describe%20the%20problem%20you're%20experiencing%3A%0A%0A"
          className={rowClass}
        >
          <div className="flex items-center gap-3.5 text-foreground">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Report a problem</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </a>
        <div onClick={() => onOpenLegal("terms-of-use")} className={rowClass}>
          <div className="flex items-center gap-3.5 text-foreground">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Terms of Use</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div onClick={() => onOpenLegal("privacy-policy")} className={rowClass}>
          <div className="flex items-center gap-3.5 text-foreground">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Privacy Policy</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div onClick={() => onOpenLegal("about")} className={rowClass}>
          <div className="flex items-center gap-3.5 text-foreground">
            <Info className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">About</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">TalkMe • Version 1.0.0</p>
    </div>
  );
}
