/**
 * Canonical style for the round icon buttons in every tab header
 * (search, bell, filter, refresh, shield, settings, new-chat, more, …).
 * Keeping this in one place guarantees identical size / font / border / bg
 * across all tabs. Use the ACTIVE variant for a toggled/selected state.
 */
export const HEADER_ICON_BTN =
  "h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-full border border-border bg-card/90 text-foreground hover:bg-muted-foreground/90 active:scale-95 transition-colors cursor-pointer";

export const HEADER_ICON_BTN_ACTIVE =
  "bg-primary/50 border-primary/80 text-foreground hover:bg-primary/100";

/** Standard icon size inside a header button. */
export const HEADER_ICON = "h-5 w-5";
