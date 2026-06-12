'use client'

import { motion, AnimatePresence, easeInOut } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, getAvatarUrl } from '@/lib/utils'
import type { PresenceStatus } from '@/lib/presence'

interface AvatarStatusBadgeProps {
  src?: string
  alt?: string
  fallback: string
  status: PresenceStatus
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showStatusDot?: boolean
  className?: string
  gender?: string | null
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

const dotSizeClasses = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
  xl: 'h-4 w-4',
}

const dotPositionClasses = {
  sm: 'bottom-0 right-0',
  md: 'bottom-0 right-0',
  lg: 'bottom-0.5 right-0.5',
  xl: 'bottom-1 right-1',
}

const statusColors: Record<PresenceStatus, { bg: string; ring: string; glow: string }> = {
  online: {
    bg: 'bg-emerald-500',
    ring: 'ring-emerald-500/30',
    glow: 'shadow-emerald-500/50',
  },
  idle: {
    bg: 'bg-amber-500',
    ring: 'ring-amber-500/30',
    glow: 'shadow-amber-500/50',
  },
  offline: {
    bg: 'bg-gray-400 dark:bg-gray-500',
    ring: 'ring-gray-400/30 dark:ring-gray-500/30',
    glow: 'shadow-gray-400/50 dark:shadow-gray-500/50',
  },
}

const pulseVariants = {
  online: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: easeInOut,
    },
  },
  typing: {
    scale: 1,
    opacity: 1,
  },
  recording: {
    scale: 1,
    opacity: 1,
  },
  offline: {
    scale: 1,
    opacity: 0.7,
  },
}

const dotVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
}

export function AvatarStatusBadge({
  src,
  alt,
  fallback,
  status,
  size = 'md',
  showStatusDot = true,
  className,
  gender,
}: AvatarStatusBadgeProps) {
  const colors = statusColors[status]
  const finalSrc = getAvatarUrl(src, gender)

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={cn(sizeClasses[size], 'border-2 border-background')}>
        <AvatarImage src={finalSrc} alt={alt} />
        <AvatarFallback className="bg-muted text-muted-foreground font-medium">
          {fallback}
        </AvatarFallback>
      </Avatar>

      <AnimatePresence mode="wait">
        {showStatusDot && (
          <motion.div
            key={status}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={dotVariants}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={cn(
              'absolute rounded-full border-2 border-background',
              dotSizeClasses[size],
              dotPositionClasses[size],
              colors.bg
            )}
          >
            {/* Pulse ring for online status */}
            {status === 'online' && (
              <motion.div
                className={cn(
                  'absolute inset-0 rounded-full',
                  colors.bg,
                  'opacity-40'
                )}
                animate={{
                  scale: [1, 1.8, 1.8],
                  opacity: [0.4, 0, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: easeInOut,
                }}
              />
            )}

            {/* Inner glow effect */}
            <motion.div
              className={cn(
                'absolute inset-0 rounded-full',
                colors.bg,
                status === 'online' ? 'shadow-lg' : '',
                colors.glow
              )}
              variants={pulseVariants}
              animate={status}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
