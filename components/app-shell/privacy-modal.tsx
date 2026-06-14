"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PrivacyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
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
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Privacy Policy</h2>
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
              <p>
                This privacy policy governs the processing of personal data collected through the website and application of TalkMe, the related mobile applications, and services (collectively, “Website” or “TalkMe”). Please read this document carefully to make sure that you understand how we handle your personal data.
              </p>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">1. General Information and Definitions</h3>
                <p>
                  <strong>About TalkMe:</strong> TalkMe allows you to connect and chat with friends and discover new people using real-time secure messaging, matchmaking services, and community forums.
                </p>
                <p>
                  <strong>Our role as a data controller:</strong> TalkMe acts as the data controller with regard to your Personal Data collected through the Services because we make decisions about the types of data that should be collected and the purposes for which they are used.
                </p>
                <p>
                  <strong>Definitions:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><em>"PD" (Personal Data)</em> means any information relating to an identified or identifiable natural person (e.g., name, email, IP address, username).</li>
                  <li><em>"NPD" (Non-Personal Data)</em> means browser type, operating system details, and other technical info that does not identify you.</li>
                  <li><em>"Processing"</em> means any use of data including collection, storage, erasure, transfer, or disclosure.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">2. Types and Purposes of Data We Process</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="p-2 font-semibold text-foreground">Situation</th>
                        <th className="p-2 font-semibold text-foreground">Data Collected</th>
                        <th className="p-2 font-semibold text-foreground">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-2 font-medium">User Account Signup</td>
                        <td className="p-2">Name, Email, Username, Age, Gender, Password, Avatar</td>
                        <td className="p-2">Create/maintain account, contract fulfillment, secure access.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Contact & Support</td>
                        <td className="p-2">Name, Email, Message Contents</td>
                        <td className="p-2">Respond to support tickets and queries.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">System Usage</td>
                        <td className="p-2">IP Address, Cookie-related details, Device identifiers</td>
                        <td className="p-2">Analytics, regional matchmaking settings, spam prevention.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">3. Sharing Your Data with Third Parties</h3>
                <p>
                  <strong>Selling Data:</strong> We do NOT sell your Personal Data to third parties for marketing or any other purposes.
                </p>
                <p>
                  <strong>Data Processors:</strong> We may share necessary data with trusted service providers to ensure the proper operation of the app (e.g. secure database hosting, system analytics, verification services). All processors must agree to maintain adequate levels of security.
                </p>
                <p>
                  <strong>Legal Requirements:</strong> We may disclose data if legally required by subpoenas, court orders, or law enforcement processes to protect our security, property, and the safety of our users.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">4. Retaining and Destroying Your Data</h3>
                <p>
                  We retain your Personal Data only for as long as it is required for business, legal, or administrative operations. When your account is deleted, or the data is no longer necessary, we securely purge or anonymize it from our active databases.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">5. Your Legal Rights</h3>
                <p>
                  Depending on your jurisdiction (e.g. GDPR, CCPA), you have several rights regarding your Personal Data:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Access:</strong> Request confirmation and copy of Personal Data held about you.</li>
                  <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete information.</li>
                  <li><strong>Erasure:</strong> Request deletion of your Personal Data when there is no compelling reason to keep it.</li>
                  <li><strong>Restrict Processing:</strong> Block further processing while maintaining data storage.</li>
                  <li><strong>Data Portability:</strong> Obtain your data in a portable machine-readable format.</li>
                </ul>
                <p>
                  To exercise any of these rights, please edit your details in settings or contact support via our email.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">6. Protecting Children's Privacy</h3>
                <p>
                  TalkMe is strictly intended for users who are <strong>18 years of age or older</strong>. We do not knowingly collect personal data from anyone under the age of 18. If we discover that a user is under 18, we will immediately delete their profile and remove all associated data from our servers.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">7. Security Policy</h3>
                <p>
                  We maintain strict technical, administrative, and physical safeguards (including SSL/HTTPS encryption for communications and WebSockets) to protect your personal data from unauthorized access, misuse, or alteration.
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex justify-end">
              <Button onClick={onClose} className="px-6">
                I Understand
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
