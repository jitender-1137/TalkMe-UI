"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[100vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">About TalkMe</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-muted"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-muted-foreground leading-relaxed scrollbar-thin">
              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">Who we are</h3>
                <p>
                  TalkMe is a real-time social chat platform that helps people connect, converse, and
                  discover new perspectives. From one-to-one messaging and group chats to anonymous
                  Quick Match conversations and a live community lobby, TalkMe is built to make
                  meeting and talking to people effortless and safe.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">Our mission</h3>
                <p>
                  We believe meaningful conversation should be accessible to everyone. Our mission is
                  to create a welcoming, respectful space where you can express yourself freely while
                  staying protected through strong privacy controls and AI-assisted moderation.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">What you can do</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Chats:</strong> Private and group conversations with friends.</li>
                  <li><strong>Quick Match:</strong> Instantly and anonymously match with someone new.</li>
                  <li><strong>Live Lobby:</strong> See who&apos;s online and start chatting right away.</li>
                  <li><strong>Discover &amp; News:</strong> Find people and stay up to date with the community.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">Privacy &amp; safety first</h3>
                <p>
                  Your privacy is central to everything we build. Anonymous matches stay anonymous,
                  and we never expose another person&apos;s private details to you. For more detail,
                  see our Privacy Policy, Cookie Policy, and Terms of Use.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">Version</h3>
                <p>TalkMe — © 2026. All rights reserved.</p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex justify-end">
              <Button onClick={onClose} className="px-6">
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
