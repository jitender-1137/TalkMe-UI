"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Cookie } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CookieModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CookieModal({ isOpen, onClose }: CookieModalProps) {
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
                <Cookie className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Cookie Policy</h2>
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
                Our website/application (the “Website” or “TalkMe”) uses cookies. In this cookie policy, we explain in detail what cookies we use, for what purposes we use them and how you can decline our use of cookies. If you do not agree with our use of cookies, please disable your cookies as described in the section “How to disable cookies?” Please beware that the full functionality of the application may not be available without cookies.
              </p>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">1. What is a cookie?</h3>
                <p>
                  A cookie is a small piece of data or a text file that is downloaded to your computer or mobile device when you access certain websites. Cookies may contain text that can be read by the web server that delivered the cookie to you. The text contained in the cookie generally consists of a sequence of letters and numbers that uniquely identifies your computer or mobile device; it may contain other information as well.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">2. What types of cookies exist?</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Strictly necessary cookies:</strong> These cookies are necessary for the proper functioning of the website, such as displaying content, logging in, validating your session, responding to your request for services, and other functions. If you disable these cookies, you may not be able to access features on our website correctly or at all.</li>
                  <li><strong>Performance cookies:</strong> These cookies collect information about the use of the website, such as pages visited, traffic sources, users’ interests, content management, and other website measurements.</li>
                  <li><strong>Functional Cookies:</strong> These cookies enable the website to remember a user’s choices – such as their language, user name, and other personal choices – while using the website.</li>
                  <li><strong>Session Cookies:</strong> These cookies link the actions of a user during a browser session. They are temporary and expire after a browser session; thus, they are not stored long term.</li>
                  <li><strong>Persistent cookies:</strong> These cookies are stored on a user’s device in between browser sessions, which allows the user’s preferences or actions across a site to be remembered.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">3. Cookie Consent</h3>
                <p>
                  When you visit the website for the first time, we may ask you to provide us with your consent to our use of cookies via a cookie consent banner. If you do not provide your consent, we will serve you technical cookies only that are strictly necessary to ensure the proper functioning of the Website. The use of such cookies does not require your consent. Please note that we may not be able to provide you with the best possible user experience if not all cookies are enabled.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">4. What cookies do we use and for what purposes?</h3>
                <p>
                  On TalkMe, we use cookies to:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Identify you when you log in and authenticate your sessions securely.</li>
                  <li>Remember your preferences, settings, and login details (e.g. your theme colors, chat background settings, active status).</li>
                  <li>Analyze traffic and usage patterns using analytics tools to improve application performance.</li>
                  <li>Detect spam and prevent abuse to ensure site security.</li>
                </ul>
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="p-2 font-semibold text-foreground">Cookie Name</th>
                        <th className="p-2 font-semibold text-foreground">Type</th>
                        <th className="p-2 font-semibold text-foreground">Expiration</th>
                        <th className="p-2 font-semibold text-foreground">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-2 font-mono text-foreground">__session</td>
                        <td className="p-2">First-party (Secure)</td>
                        <td className="p-2">Session / Persistent</td>
                        <td className="p-2">Stores JWT token to authenticate login sessions.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono text-foreground">theme-color</td>
                        <td className="p-2">First-party (Local Storage)</td>
                        <td className="p-2">Persistent</td>
                        <td className="p-2">Saves selected visual theme custom colors.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono text-foreground">chat-bg</td>
                        <td className="p-2">First-party (Local Storage)</td>
                        <td className="p-2">Persistent</td>
                        <td className="p-2">Saves selected custom chat background classes.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono text-foreground">theme</td>
                        <td className="p-2">First-party (next-themes)</td>
                        <td className="p-2">Persistent</td>
                        <td className="p-2">Saves light/dark system mode selection.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">5. Disabling Cookies</h3>
                <p>
                  You can manage the acceptance or rejection of cookies on your browser by altering its settings. Please keep in mind that refusing necessary cookies will likely influence your experience or prevent usage of our services.
                </p>
                <p>
                  For guides on popular browsers, consult the following links:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Chrome</a></li>
                  <li><a href="https://support.apple.com/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Apple Safari</a></li>
                  <li><a href="https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Mozilla Firefox</a></li>
                  <li><a href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63fd9abd-d662-e24e-240a-2839b5066a11" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Microsoft Edge</a></li>
                </ul>
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
