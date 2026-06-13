"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface MatchRadarProps {
  isSearching: boolean
  onPulse?: () => void
}

export function MatchRadar({ isSearching }: MatchRadarProps) {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      
      {/* Middle ring */}
      <div className="absolute inset-8 rounded-full border border-primary/30" />
      
      {/* Inner ring */}
      <div className="absolute inset-16 rounded-full border border-primary/40" />
      
      {/* Center dot */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary"
        animate={isSearching ? {
          scale: [1, 1.2, 1],
          boxShadow: [
            "0 0 0 0 rgba(var(--primary), 0.4)",
            "0 0 20px 10px rgba(var(--primary), 0.2)",
            "0 0 0 0 rgba(var(--primary), 0)"
          ]
        } : {}}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Scanning beam */}
      {isSearching && (
        <motion.div
          className="absolute inset-0 origin-center"
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className="absolute left-1/2 top-1/2 w-1/2 h-0.5 origin-left">
            <div className="w-full h-full bg-gradient-to-r from-primary via-primary/50 to-transparent" />
          </div>
          {/* Trailing glow */}
          <div className="absolute left-1/2 top-1/2 w-1/2 h-16 origin-left -translate-y-1/2">
            <div className="w-full h-full bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-r-full opacity-50" />
          </div>
        </motion.div>
      )}
      
      {/* Pulse rings when searching */}
      {isSearching && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-primary/40"
              initial={{ scale: 0.2, opacity: 0.8 }}
              animate={{ scale: 1.1, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.7,
                ease: "easeOut"
              }}
            />
          ))}
        </>
      )}
      
      {/* Random dots representing potential matches */}
      {isSearching && (
        <>
          {[
            { x: 20, y: 30, delay: 0 },
            { x: 70, y: 20, delay: 0.5 },
            { x: 80, y: 60, delay: 1 },
            { x: 25, y: 75, delay: 1.5 },
            { x: 60, y: 80, delay: 2 },
          ].map((dot, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/60"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: dot.delay,
                ease: "easeInOut"
              }}
            />
          ))}
        </>
      )}
      
      {/* Grid overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20"
        viewBox="0 0 100 100"
      >
        {/* Horizontal lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeWidth="0.2" className="text-primary" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.2" className="text-primary" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeWidth="0.2" className="text-primary" />
        {/* Vertical lines */}
        <line x1="25" y1="0" x2="25" y2="100" stroke="currentColor" strokeWidth="0.2" className="text-primary" />
        <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.2" className="text-primary" />
        <line x1="75" y1="0" x2="75" y2="100" stroke="currentColor" strokeWidth="0.2" className="text-primary" />
      </svg>
    </div>
  )
}
