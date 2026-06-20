"use client"

import { haptic, hapticsSupported, type HapticIntent } from "@/lib/haptics"

/**
 * Thin React wrapper over lib/haptics (spec §9, §20).
 *
 * The returned `haptic` reference is stable (module-level fn), so it's safe in
 * deps arrays and event handlers without memoization.
 *
 *   const { haptic } = useHaptics()
 *   <button onClick={() => { haptic("impactLight"); switchTab() }} />
 */
export function useHaptics(): {
  haptic: (intent?: HapticIntent) => void
  supported: boolean
} {
  return { haptic, supported: hapticsSupported() }
}
