'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * iOS-style notification banner (spec §13): frosted glass, rounded, slides
 * from the top under the Dynamic Island / status bar — not a flat web toast.
 *
 * Restyles sonner centrally, so every existing `toast()` / `toast.success()`
 * call across the app inherits the look with no call-site changes. Visual
 * details (blur, radius, shadow, easing, per-type icon color) live in the
 * `.ios-toast*` rules in app/globals.css.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position="top-center"
      // Sit below the safe-area inset (Dynamic Island / notch). §2
      offset="calc(env(safe-area-inset-top, 0px) + 0.625rem)"
      mobileOffset="calc(env(safe-area-inset-top, 0px) + 0.625rem)"
      gap={8}
      // iOS banners auto-dismiss / swipe away — no persistent X chrome.
      toastOptions={{
        classNames: {
          toast: 'ios-toast',
          title: 'ios-toast-title',
          description: 'ios-toast-desc',
          icon: 'ios-toast-icon',
          actionButton: 'ios-toast-action',
          cancelButton: 'ios-toast-cancel',
        },
      }}
      style={
        {
          // Translucent surface so the glass blur behind it shows through.
          '--normal-bg': 'color-mix(in oklch, var(--popover) 80%, transparent)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'transparent',
          '--border-radius': '1.375rem',
        } as React.CSSProperties
      }
      className="ios-toaster"
      {...props}
    />
  )
}

export { Toaster }
