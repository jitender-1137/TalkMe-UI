"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Mail, MessageSquare, LifeBuoy, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ContactUsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ContactUsModal({ isOpen, onClose }: ContactUsModalProps) {
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
            className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Contact Us</h2>
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
                <p>
                  We&apos;d love to hear from you. Whether you have a question, found a bug, or want
                  to share feedback, reach out through any of the channels below and our team will get
                  back to you as soon as possible.
                </p>
              </section>

              <section className="space-y-3">
                <a
                  href="mailto:support@talkme.app"
                  className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-4 hover:bg-muted/30 transition-colors"
                >
                  <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">General Support</h3>
                    <p className="text-xs">support@talkme.app — for account help, bugs, and general questions.</p>
                  </div>
                </a>

                <a
                  href="mailto:privacy@talkme.app"
                  className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-4 hover:bg-muted/30 transition-colors"
                >
                  <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Privacy &amp; Safety</h3>
                    <p className="text-xs">privacy@talkme.app — to report abuse or raise a privacy concern.</p>
                  </div>
                </a>

                <a
                  href="mailto:hello@talkme.app"
                  className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-4 hover:bg-muted/30 transition-colors"
                >
                  <LifeBuoy className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Business &amp; Partnerships</h3>
                    <p className="text-xs">hello@talkme.app — for partnerships, press, and other inquiries.</p>
                  </div>
                </a>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">Response time</h3>
                <p>
                  We typically respond within 1–2 business days. For urgent safety issues, please use
                  the Privacy &amp; Safety contact above and include as much detail as possible.
                </p>
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
