"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "./auth-context"
import { Turnstile } from "@/components/security/turnstile"
import { X, Mail, Lock, Eye, EyeOff } from "lucide-react"

export function LoginModal() {
  const { showLoginModal, closeLoginModal, openSignupModal, login, isLoginPending, loginError } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [captchaToken, setCaptchaToken] = useState("")
  const [website, setWebsite] = useState("") // honeypot

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError("")
    setPasswordError("")

    let hasError = false
    if (!email) {
      setEmailError("Email is required")
      hasError = true
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address")
      hasError = true
    }

    if (!password) {
      setPasswordError("Password is required")
      hasError = true
    }

    if (hasError) return

    login(email, password, false, captchaToken, website)
  }

  const handleSwitchToSignup = () => {
    setEmail("")
    setPassword("")
    setEmailError("")
    setPasswordError("")
    openSignupModal()
  }

  return (
    <AnimatePresence>
      {showLoginModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto flex justify-center items-start bg-black/60 backdrop-blur-xs p-4 md:py-10"
          onClick={closeLoginModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 h-8 w-8"
                onClick={closeLoginModal}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl overflow-hidden shadow-md">
                  <img src="/apple-icon.png" alt="TalkMe" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-xl font-bold">TalkMe</h1>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground mt-1">Sign in to continue chatting</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              {loginError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {loginError}
                </div>
              )}

              <div className="relative mt-4">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError("")
                  }}
                  aria-invalid={!!emailError}
                  className="pl-10 h-10"
                />
                <Label
                  htmlFor="email"
                  className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                >
                  Email
                </Label>
                {emailError && (
                  <p className="text-xs text-destructive mt-1">{emailError}</p>
                )}
              </div>

              <div className="relative mt-4">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (passwordError) setPasswordError("")
                  }}
                  aria-invalid={!!passwordError}
                  className="pl-10 pr-10 h-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 z-10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Label
                  htmlFor="password"
                  className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                >
                  Password
                </Label>
                {passwordError && (
                  <p className="text-xs text-destructive mt-1">{passwordError}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="link" className="px-0 text-sm text-primary">
                  Forgot password?
                </Button>
              </div>

              {/* Honeypot — hidden from real users; bots tend to fill it */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="hidden"
                aria-hidden="true"
              />

              {/* Bot challenge */}
              <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken("")} className="flex justify-center" />

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoginPending}
              >
                {isLoginPending ? "Signing in..." : "Sign In"}
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {"Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={handleSwitchToSignup}
                  className="text-primary font-medium hover:underline"
                >
                  Sign up
                </button>
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
