"use client"

import { useStandalone } from "@/hooks/use-standalone"

/**
 * Mounts the iOS foundation runtime side-effects at the app root (spec §24):
 * sets `html.standalone` when running as an installed PWA so the global CSS can
 * switch to full-screen native layout. Renders nothing.
 */
export function NativeEnv() {
  useStandalone()
  return null
}
