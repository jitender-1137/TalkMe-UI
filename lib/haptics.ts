/**
 * Haptics (spec §9, §20).
 *
 * Single source of truth for tactile feedback, keyed by *intent* rather than
 * raw vibration patterns — call sites say what happened, not how long to buzz.
 *
 *   import { haptic } from "@/lib/haptics"
 *   haptic("send")        // message sent
 *   haptic("impactLight") // tab switch, toggle
 *   haptic("error")       // failed action
 *
 * Reality check on the web platform:
 *  - Android Chrome supports navigator.vibrate — patterns work.
 *  - iOS Safari does NOT expose the Vibration API, even in standalone PWAs.
 *    There is no web API for the Taptic Engine. So on iPhone these are no-ops
 *    today; this module centralizes the intent so that when a native wrapper
 *    (Capacitor/WKWebView bridge) is added later, only this file changes.
 */

export type HapticIntent =
  | 'selection'    // light tick — picker / segmented control change
  | 'impactLight'  // tab switch, toggle, sheet open
  | 'impactMedium' // button confirm, pull-to-refresh armed
  | 'impactHeavy'  // long-press / context menu open
  | 'send'         // message sent
  | 'success'      // completed action (follow, like)
  | 'warning'
  | 'error'        // failed action

/** Vibration patterns (ms). Single number = one buzz; array = pattern. */
const PATTERNS: Record<HapticIntent, number | number[]> = {
  selection: 8,
  impactLight: 10,
  impactMedium: 18,
  impactHeavy: 40,
  send: 12,
  success: [12, 40, 12],
  warning: [20, 60, 20],
  error: [30, 50, 30, 50],
}

let enabled = true

/** Globally mute/unmute haptics (e.g. from a settings toggle). */
export function setHapticsEnabled(value: boolean) {
  enabled = value
}

/** Whether the current platform can actually produce vibration. */
export function hapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

/** Fire haptic feedback for an intent. Safe to call anywhere; no-ops on SSR
 *  and on platforms without the Vibration API (notably iOS). */
export function haptic(intent: HapticIntent = 'selection'): void {
  if (!enabled || !hapticsSupported()) return
  try {
    navigator.vibrate(PATTERNS[intent])
  } catch {
    /* ignore — some browsers throw if called without user activation */
  }
}
