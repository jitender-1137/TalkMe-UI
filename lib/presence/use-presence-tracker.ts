'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePresenceStore } from './store'

const ACTIVITY_DEBOUNCE = 1000 // 1 second debounce for activity updates

export function usePresenceTracker() {
  const {
    setDocumentVisible,
    setWindowFocused,
    setOnline,
    updateLastActive,
    computePresence,
  } = usePresenceStore()

  const lastActivityUpdate = useRef(0)

  // Debounced activity update
  const handleActivity = useCallback(() => {
    const now = Date.now()
    if (now - lastActivityUpdate.current > ACTIVITY_DEBOUNCE) {
      lastActivityUpdate.current = now
      updateLastActive()
      computePresence()
    }
  }, [updateLastActive, computePresence])

  useEffect(() => {
    // Initialize with current values
    if (typeof document !== 'undefined') {
      setDocumentVisible(document.visibilityState === 'visible')
      console.log('[v0] Initial document.visibilityState:', document.visibilityState)
    }
    
    if (typeof window !== 'undefined') {
      setOnline(navigator.onLine)
      console.log('[v0] Initial navigator.onLine:', navigator.onLine)
    }

    // Document visibility handler
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible'
      setDocumentVisible(isVisible)
    }

    // Window focus handlers
    const handleFocus = () => {
      console.log('[v0] window.onfocus triggered')
      setWindowFocused(true)
      handleActivity()
    }

    const handleBlur = () => {
      console.log('[v0] window.onblur triggered')
      setWindowFocused(false)
    }

    // Network status handlers
    const handleOnline = () => {
      console.log('[v0] navigator.onLine: online event')
      setOnline(true)
    }

    const handleOffline = () => {
      console.log('[v0] navigator.onLine: offline event')
      setOnline(false)
    }

    // User activity handlers
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll']

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Periodic presence check (every 30 seconds)
    const intervalId = setInterval(() => {
      computePresence()
    }, 30000)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
      
      clearInterval(intervalId)
    }
  }, [setDocumentVisible, setWindowFocused, setOnline, handleActivity, computePresence])
}
