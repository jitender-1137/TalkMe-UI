"use client"

import { useRef, useCallback, useEffect } from "react"
import { haptic } from "@/lib/haptics"

interface LongPressOptions {
  /** Duration in ms before long-press fires (default: 480) */
  delay?: number
  /** Called when long-press threshold is reached */
  onLongPress: (e: PointerEvent) => void
  /** Called on normal tap/click (no long press) */
  onClick?: (e: PointerEvent) => void
  /** Movement tolerance in px before cancelling (default: 10) */
  moveThreshold?: number
}

interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerLeave: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
}

/**
 * Production-grade long-press hook using the Pointer Events API.
 * - Works on both touch and mouse
 * - Cancels on movement, pointer-leave, and scroll
 * - Provides haptic vibration on trigger
 * - Returns spread-ready event handlers
 */
export function useLongPress({
  delay = 480,
  onLongPress,
  onClick,
  moveThreshold = 10,
}: LongPressOptions): LongPressHandlers {
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPos   = useRef<{ x: number; y: number } | null>(null)
  const triggered  = useRef(false)
  const moved      = useRef(false)
  const pointerId  = useRef<number | null>(null)

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startPos.current = null
    pointerId.current = null
  }, [])

  // Track pointer movement via document-level listener
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId.current || !startPos.current) return
      
      const dx = Math.abs(e.clientX - startPos.current.x)
      const dy = Math.abs(e.clientY - startPos.current.y)
      
      if (dx > moveThreshold || dy > moveThreshold) {
        moved.current = true
        // Cancel long-press timer on significant movement
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    }

    document.addEventListener("pointermove", handlePointerMove)
    return () => document.removeEventListener("pointermove", handlePointerMove)
  }, [moveThreshold])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only handle primary pointer (ignore multi-touch second fingers)
      if (e.button !== 0 && e.pointerType !== "touch") return

      triggered.current = false
      moved.current = false
      pointerId.current = e.pointerId
      startPos.current = { x: e.clientX, y: e.clientY }

      timerRef.current = setTimeout(() => {
        // Don't fire long-press if user has moved (scrolling)
        if (moved.current) {
          cancel()
          return
        }
        triggered.current = true
        // Haptic feedback — context menu / long-press opening (spec §20)
        haptic("impactHeavy")
        onLongPress(e.nativeEvent)
        cancel()
      }, delay)
    },
    [delay, onLongPress, cancel]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerId.current) return
      const wasTriggered = triggered.current
      const wasMoved = moved.current
      cancel()
      // Only fire onClick if no long-press AND no significant movement (scroll)
      if (!wasTriggered && !wasMoved) {
        onClick?.(e.nativeEvent)
      }
    },
    [cancel, onClick]
  )

  const onPointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerId.current) return
      cancel()
    },
    [cancel]
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerId.current) return
      moved.current = true // Treat cancel as movement to suppress click
      cancel()
    },
    [cancel]
  )

  // Right-click on desktop → treat as long-press immediately
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      triggered.current = true
      onLongPress(e.nativeEvent as unknown as PointerEvent)
    },
    [onLongPress]
  )

  return { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, onContextMenu }
}
