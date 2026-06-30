"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
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
            className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-screen overflow-hidden"
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
              <p className="text-xs text-muted-foreground/80">Last updated: June 30, 2026</p>
              <p>
                This privacy policy governs the processing of personal data collected through the
                website and application of TalkMe, the related mobile applications, and services
                (collectively, “Website” or “TalkMe”). Please read this document carefully to make
                sure that you understand how we handle your personal data.
              </p>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  1. General Information and Definitions
                </h3>
                <p>
                  <strong>About TalkMe:</strong> TalkMe allows you to connect and chat with friends
                  and discover new people using real-time secure messaging, anonymous matchmaking, a
                  public lobby, media and voice sharing, ephemeral Stories, and a community feed.
                </p>
                <p>
                  <strong>Our role as a data controller:</strong> TalkMe acts as the data controller
                  with regard to your Personal Data collected through the Services because we make
                  decisions about the types of data that should be collected and the purposes for
                  which they are used.
                </p>
                <p>
                  <strong>Definitions:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <em>"PD" (Personal Data)</em> means any information relating to an identified or
                    identifiable natural person (e.g., name, email, IP address, username).
                  </li>
                  <li>
                    <em>"NPD" (Non-Personal Data)</em> means browser type, operating system details,
                    and other technical info that does not identify you.
                  </li>
                  <li>
                    <em>"Processing"</em> means any use of data including collection, storage,
                    erasure, transfer, or disclosure.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  2. Types and Purposes of Data We Process
                </h3>
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
                        <td className="p-2">
                          Name, Email, Username, Age, Gender, Password, Avatar, Bio, Interests
                        </td>
                        <td className="p-2">
                          Create/maintain account, contract fulfillment, secure access.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Messages &amp; Media</td>
                        <td className="p-2">
                          Message text, photos, videos, voice notes, audio, documents, GIFs/stickers
                        </td>
                        <td className="p-2">
                          Deliver and store your conversations and shared media (excludes anonymous
                          matchmaking, which is not stored).
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Posts, Stories &amp; Feed</td>
                        <td className="p-2">Post/Story media &amp; captions, comments, likes</td>
                        <td className="p-2">
                          Publish and display content you choose to share with the community.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Presence &amp; Activity</td>
                        <td className="p-2">
                          Online/away/offline status, last-seen time, typing &amp; read receipts
                        </td>
                        <td className="p-2">
                          Show real-time availability; configurable in privacy settings.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Profile Views</td>
                        <td className="p-2">Identity of the viewer, view type, count, timestamp</td>
                        <td className="p-2">
                          Show you who viewed your profile or photo (self-views and anonymous
                          matches are excluded).
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Notifications</td>
                        <td className="p-2">
                          Push subscription / device token, notification permissions
                        </td>
                        <td className="p-2">
                          Deliver browser, desktop, and push notifications you opt into.
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Contact &amp; Support</td>
                        <td className="p-2">Name, Email, Message Contents</td>
                        <td className="p-2">Respond to support tickets and queries.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">System Usage</td>
                        <td className="p-2">
                          IP Address, Cookie-related details, Device identifiers
                        </td>
                        <td className="p-2">
                          Analytics, regional matchmaking settings, spam prevention.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  3. Anonymous Matchmaking
                </h3>
                <p>
                  Our Quick Match feature pairs you with another user anonymously. We deliberately
                  do <strong>not</strong> expose your identity (name, username, avatar, profile, or
                  account identifier) to your match partner, nor theirs to you. Messages and media
                  exchanged during a match are processed in memory to relay them in real time and
                  are <strong>not persisted</strong> to our databases after the session ends.
                  Profile-view tracking is never applied to anonymous matches.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  4. Automated Moderation &amp; On-Device AI
                </h3>
                <p>
                  <strong>Content moderation:</strong> To keep the platform safe, text you submit is
                  automatically screened, and images and videos you upload may be analyzed by a
                  machine-learning classifier to detect explicit or prohibited material. This
                  processing is used for safety and enforcement and may flag, hold, or block
                  content.
                </p>
                <p>
                  <strong>On-device AI:</strong> Some assistive features — such as smart-reply
                  suggestions — run entirely in your browser. The underlying model is downloaded
                  from a third-party model host (Hugging Face) and cached by your browser; the
                  message text it analyzes to generate suggestions is processed locally on your
                  device and is <strong>not sent to our servers</strong> for that purpose.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  5. Data Stored on Your Device
                </h3>
                <p>
                  To make the app fast and available offline, we cache some of your data locally in
                  your browser (for example, your conversations and messages in IndexedDB, and
                  preferences such as theme, chat background, and notification settings in local
                  storage). This local cache is scoped to your account and is cleared when you log
                  out. Clearing your browser storage will remove it from your device. See our Cookie
                  Policy for details.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  6. Sharing Your Data with Third Parties
                </h3>
                <p>
                  <strong>Selling Data:</strong> We do NOT sell your Personal Data to third parties
                  for marketing or any other purposes.
                </p>
                <p>
                  <strong>Data Processors &amp; Integrations:</strong> We may share necessary data
                  with trusted service providers to operate the app — for example, secure database
                  and media hosting, an email delivery provider for password-reset and account
                  emails, a push-notification service, GIF search (Giphy), and a machine-learning
                  model host (Hugging Face) used for in-browser features. When you use such
                  integrations, limited technical data (such as your IP address or search terms) may
                  be processed by that provider under its own terms. All processors are expected to
                  maintain adequate levels of security.
                </p>
                <p>
                  <strong>Legal Requirements:</strong> We may disclose data if legally required by
                  subpoenas, court orders, or law enforcement processes to protect our security,
                  property, and the safety of our users.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  7. Retaining and Destroying Your Data
                </h3>
                <p>
                  We retain your Personal Data only for as long as it is required for business,
                  legal, or administrative operations. When you request account deletion, your
                  account is deactivated immediately; you may restore it by logging in within a
                  limited grace period (currently 30 days). After that window, your data is
                  permanently purged or irreversibly anonymized from our active databases. Anonymous
                  matchmaking content is not retained at all.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">8. Your Legal Rights</h3>
                <p>
                  Depending on your jurisdiction (e.g. GDPR, CCPA), you have several rights
                  regarding your Personal Data:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Access:</strong> Request confirmation and copy of Personal Data held
                    about you.
                  </li>
                  <li>
                    <strong>Rectification:</strong> Request correction of inaccurate or incomplete
                    information.
                  </li>
                  <li>
                    <strong>Erasure:</strong> Request deletion of your Personal Data when there is
                    no compelling reason to keep it.
                  </li>
                  <li>
                    <strong>Restrict Processing:</strong> Block further processing while maintaining
                    data storage.
                  </li>
                  <li>
                    <strong>Data Portability:</strong> Obtain your data in a portable
                    machine-readable format.
                  </li>
                </ul>
                <p>
                  To exercise any of these rights, please edit your details in settings or contact
                  support via our email.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  9. Protecting Children's Privacy
                </h3>
                <p>
                  TalkMe is strictly intended for users who are{" "}
                  <strong>18 years of age or older</strong>. We do not knowingly collect personal
                  data from anyone under the age of 18. If we discover that a user is under 18, we
                  will immediately delete their profile and remove all associated data from our
                  servers.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">10. Security Policy</h3>
                <p>
                  We maintain strict technical, administrative, and physical safeguards (including
                  SSL/HTTPS encryption for communications and WebSockets) to protect your personal
                  data from unauthorized access, misuse, or alteration.
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
  );
}
