/**
 * iOS motion system (spec §23 "everything uses springs").
 *
 * Shared framer-motion transition presets so every screen animates with the
 * same physics instead of ad-hoc `type: "spring"` objects scattered per file.
 * Import these instead of hand-tuning stiffness/damping inline.
 *
 *   import { spring, transitions, variants } from "@/lib/motion"
 *   <motion.div layout transition={spring.snappy} />
 *   <motion.div {...variants.sheet} />
 */

import type { Transition, Variants } from 'framer-motion'

/** Named spring presets, tuned to feel like the system animations. */
export const spring = {
  /** Default UI spring — buttons, toggles, small state changes. */
  default: { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 },
  /** Snappy & tight — context menus, reactions, taps. */
  snappy: { type: 'spring', stiffness: 500, damping: 32, mass: 0.7 },
  /** Gentle & smooth — page/sheet presentation, large surfaces. */
  smooth: { type: 'spring', stiffness: 300, damping: 34, mass: 1 },
  /** Bouncy — message bubble send, "pop" reactions (§12). */
  bouncy: { type: 'spring', stiffness: 520, damping: 18, mass: 0.9 },
  /** Stiff, near-instant — drag-follow / gesture tracking release. */
  stiff: { type: 'spring', stiffness: 700, damping: 40, mass: 0.6 },
} satisfies Record<string, Transition>

/**
 * Tween fallbacks using the iOS easing curve, for properties that shouldn't
 * overshoot (opacity, color, blur). Mirrors the CSS `--ease-ios*` tokens.
 */
export const ease = {
  ios: [0.32, 0.72, 0, 1],
  iosOut: [0.16, 1, 0.3, 1],
  iosBounce: [0.175, 0.885, 0.32, 1.275],
} as const

export const transitions = {
  fade: { duration: 0.2, ease: ease.ios },
  fadeFast: { duration: 0.12, ease: ease.ios },
  page: { duration: 0.35, ease: ease.ios },
} satisfies Record<string, Transition>

/**
 * Ready-made enter/exit variants. Spread onto a `motion` element together with
 * `<AnimatePresence>` for consistent presentation across the app.
 */
export const variants = {
  /** Bottom sheet slide-up (§6). Pair with AnimatePresence. */
  sheet: {
    initial: { y: '100%' },
    animate: { y: 0, transition: spring.smooth },
    exit: { y: '100%', transition: transitions.fade },
  },
  /** Context menu / popover scale-in from interaction point (§5). */
  popIn: {
    initial: { scale: 0.92, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: spring.snappy },
    exit: { scale: 0.95, opacity: 0, transition: transitions.fadeFast },
  },
  /** Outgoing message bubble — scale + fade (§12). */
  bubbleOut: {
    initial: { scale: 0.8, opacity: 0, y: 8 },
    animate: { scale: 1, opacity: 1, y: 0, transition: spring.bouncy },
  },
  /** Incoming message bubble — slide up + fade (§12). */
  bubbleIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: spring.default },
  },
  /** Full-screen overlay backdrop blur/fade (image & video viewer §17/§18). */
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: transitions.fade },
    exit: { opacity: 0, transition: transitions.fade },
  },
} satisfies Record<string, Variants>
