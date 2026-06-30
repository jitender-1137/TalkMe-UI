"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
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
                <ShieldAlert className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Terms of Use</h2>
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

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">1. Introduction</h3>
                <p>
                  Welcome to TalkMe (referred to as "We", "Us", "Our", or "TalkMe"). TalkMe provides
                  online real-time chat, anonymous matchmaking ("Quick Match"), a public lobby,
                  one-to-one and group messaging, voice notes and media sharing, ephemeral Stories,
                  a community feed (posts, likes, and comments), profile discovery, and related
                  community services (referred to as "Services"). By using our website, application,
                  and Services, you agree to these Terms of Use. Please read and understand all
                  terms. If you disagree with any part of these terms, you should refrain from using
                  our application and Services.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">2. Eligibility</h3>
                <p>
                  You must be at least <strong>eighteen (18) years of age</strong> to access and use
                  the chat services provided on TalkMe. By using our Services, you affirm and
                  warrant that:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Age Requirement:</strong> You are of legal age (18 or older) to enter
                    into a binding agreement and not barred from receiving services under the laws
                    of your jurisdiction.
                  </li>
                  <li>
                    <strong>Responsible Use:</strong> Your use of our services will be in compliance
                    with all applicable laws and regulations. You agree that your content and
                    conduct on the site shall not be obscene, unlawful, threatening, abusive,
                    hateful, or discriminatory. You shall not post, upload, or transmit any content
                    that is pornographic, violent, lewd, sexually suggestive, or otherwise
                    objectionable.
                  </li>
                  <li>
                    <strong>Protection of Minors:</strong> You represent and warrant that you will
                    not solicit personal information from or engage in any exploitative, sexual, or
                    violent manner towards anyone under the age of eighteen (18). You agree to
                    report any suspected underage users to the TalkMe administration immediately.
                  </li>
                  <li>
                    <strong>Content Integrity:</strong> You assure that your activities and content
                    on the site do not infringe upon the rights of others, including intellectual
                    property rights. TalkMe reserves the right, but disclaims any obligation or
                    duty, to monitor content posted by users and disclaims any liability for
                    user-generated content.
                  </li>
                  <li>
                    <strong>Prohibited Activities:</strong> You are prohibited from engaging in
                    activities that disrupt or interfere with the operation of the site, including
                    but not limited to stalking, harassment, impersonation, providing false
                    information, attempting unauthorized access to restricted areas, and uploading
                    harmful or disruptive code. The use of automated systems, such as bots, for data
                    mining or spam purposes is strictly forbidden.
                  </li>
                </ul>
                <p className="text-destructive font-medium pt-1">
                  Violation of these terms may lead to immediate suspension or termination of your
                  account and potential legal action. TalkMe reserves the right to remove any
                  content that violates these terms and conditions without prior notice.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  3. Your Content &amp; License
                </h3>
                <p>
                  TalkMe lets you create and share content — including text messages, photos,
                  videos, voice notes, audio, documents, GIFs and stickers, profile photos and
                  display names, ephemeral Stories, and community feed posts and comments
                  (collectively, "User Content"). You retain ownership of your User Content. By
                  submitting it, you grant TalkMe a non-exclusive, worldwide, royalty-free license
                  to host, store, reproduce, adapt (e.g. compress or generate thumbnails), and
                  display that content solely as needed to operate, secure, and improve the
                  Services.
                </p>
                <p>
                  You are solely responsible for your User Content and confirm that you have the
                  rights to share it and that it does not infringe the rights of others. We may
                  remove, restrict, or refuse any content that violates these Terms or our content
                  standards, with or without notice.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  4. Public Posts, Stories &amp; the Community Feed
                </h3>
                <p>
                  Content you publish to the community feed (posts and comments) and Stories you
                  share is visible to other users of TalkMe and may be associated with your profile,
                  including likes and the list of users who liked it. Do not post anything you are
                  not comfortable sharing broadly. Stories are intended to be ephemeral, but you
                  should not assume any content shared online can be permanently or fully deleted
                  once others have viewed it.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  5. Anonymous Matchmaking (Quick Match)
                </h3>
                <p>
                  Quick Match pairs you with another user anonymously. We do not reveal your
                  identity (name, username, avatar, profile, or account identifier) to your match
                  partner, and we do not reveal theirs to you. You agree{" "}
                  <strong>
                    not to attempt to identify, de-anonymize, locate, record, screenshot, or track
                  </strong>{" "}
                  a match partner, and not to solicit identifying or personal information in a
                  manner that circumvents this anonymity. Quick Match conversations are ephemeral
                  and are not stored on our servers after the session ends. Treat anyone you meet
                  through matchmaking with caution and never share sensitive personal or financial
                  information.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  6. Mature (18+) Content &amp; Mutual Consent
                </h3>
                <p>
                  Because all users are adults, TalkMe permits mature ("18+") content{" "}
                  <strong>
                    only within a private one-to-one conversation or a Quick Match session, and only
                    after both participants have explicitly granted consent
                  </strong>{" "}
                  through our in-app consent prompt. Until consent is granted, content our systems
                  flag as explicit is held and not delivered. Either party may decline or revoke
                  consent at any time, and repeated requests are limited.
                </p>
                <p>
                  Mature content is <strong>strictly prohibited</strong> in group chats, the public
                  lobby, the community feed, comments, Stories, profile photos, and display names.
                  Sharing sexual content involving minors, non-consensual content, or content
                  depicting a real person without their consent is forbidden, will be removed, and
                  may be reported to the relevant authorities.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  7. Presence, Activity &amp; Notifications
                </h3>
                <p>
                  The Services display presence information (such as online / away / offline status,
                  typing indicators, last-seen time, and read receipts) and may record and surface
                  when another user views your profile or photo ("Profile Views"). You can adjust
                  some of these signals in your privacy settings. With your permission, we may also
                  send you browser, desktop, and push notifications; you can disable these in your
                  device or app settings at any time.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">8. Privacy Policy</h3>
                <p>
                  Please review our detailed Privacy Policy, accessible during signup and from the
                  settings page, for more information on how we collect, use, and protect your
                  personal information.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">9. Proprietary Rights</h3>
                <p>
                  Except for information in the public domain or for which we have obtained a
                  license or permission from a third-party, all rights, including but not limited to
                  Content, Software, copyrights, and Trademarks, are owned by and reserved to us.
                  You are not allowed to copy, distribute, publish, or sell any such proprietary
                  information without our express written consent.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">10. Content Standards</h3>
                <p>
                  Users must abide by content standards set by us. Any content deemed inappropriate,
                  offensive, or in violation of these standards may result in the removal of the
                  content and potential termination of the user's account.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  11. Termination &amp; Account Deletion
                </h3>
                <p>
                  We reserve the right to suspend or terminate a user's account without any prior
                  notice if these Terms of Use are violated. Such termination can occur without
                  warning and may result in the deletion of all information associated with the
                  account. Upon termination, users lose all access to our services and any
                  outstanding or prospective benefits. We are not liable for any damage or loss
                  resulting from such termination.
                </p>
                <p>
                  You may delete your own account at any time from your settings. When you request
                  deletion, your account is deactivated immediately and scheduled for permanent
                  removal. For a limited grace period (currently 30 days) you may restore your
                  account simply by logging back in; after that window your personal data is
                  permanently purged or irreversibly anonymized and cannot be recovered.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  12. Limitation of Liability &amp; Disclaimer of Warranties
                </h3>
                <p>
                  The Site and the Service are provided "AS-IS". We claim immunity from liability to
                  the fullest extent under the law and as provided under section 230 of the
                  Communications Decency Act (or corresponding local laws) for Content provided by
                  third parties and members. We expressly disclaim any warranty of fitness for a
                  particular purpose or non-infringement. We cannot guarantee and do not promise any
                  specific results from use of TalkMe.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">13. Indemnity</h3>
                <p>
                  You agree to indemnify and hold us, our subsidiaries, affiliates, officers,
                  agents, and partners harmless from any loss, liability, claim, or demand,
                  including reasonable attorney's fees, due to or arising out of your use of the
                  service in violation of this Agreement.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">14. Cost of Services</h3>
                <p>
                  We offer a basic membership that is free, allowing you to search the member
                  community, engage in community forums, create a profile, and exchange messages.
                  Basic membership provides access to core features, ensuring all members can
                  participate in the community. Optional premium enhancements may be offered, and no
                  refunds are offered for any membership-related services.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  15. AI Features, Moderation &amp; Enforcement
                </h3>
                <p>
                  To maintain a safe and respectful environment, TalkMe uses automated moderation to
                  detect and prevent rule violations, including harassment, scams, illegal activity,
                  and explicit imagery. This includes automated text screening and machine-learning
                  classification of images and videos. Some assistive AI features — such as
                  smart-reply suggestions — run locally in your browser and process recent message
                  text on your device to generate suggestions; suggestions are optional and you are
                  responsible for any message you choose to send.
                </p>
                <p>
                  Automated systems are not perfect and may produce false positives or negatives;
                  final enforcement decisions may involve human review. Users who violate our Terms
                  of Use may receive warnings, temporary restrictions, or permanent suspension.
                  Reports from users are reviewed alongside automated analysis to ensure fair and
                  accurate moderation. Attempting to evade, disable, or circumvent our moderation
                  systems is itself a violation of these Terms.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">16. Severability</h3>
                <p>
                  If any provision of these Terms of Use is found to be invalid or unenforceable
                  under any applicable law by a court of competent jurisdiction, such invalidity or
                  unenforceability shall not in any way affect the other provisions of these Terms
                  of Use. The remaining provisions shall remain in full force and effect.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  17. Changes to the Terms
                </h3>
                <p>
                  We reserve the right to modify these Terms of Use at any time. We will notify
                  users of any changes and by continuing to use our website and services, users
                  agree to be bound by the updated Terms of Use.
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
