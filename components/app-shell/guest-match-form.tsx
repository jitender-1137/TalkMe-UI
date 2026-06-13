"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "./auth-context"
import { User, Calendar, Users, Heart, Shield, Zap } from "lucide-react"

export function GuestMatchForm() {
  const { loginAsGuest, openLoginModal, openSignupModal } = useAuth()
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Please enter your name")
      return
    }

    const ageNum = parseInt(age)
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      setError("Please enter a valid age (18-99)")
      return
    }

    if (!gender) {
      setError("Please select your gender")
      return
    }

    loginAsGuest(name.trim(), ageNum, gender)
  }

  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
  ]

  return (
    <div className="flex flex-col h-[100dvh] overflow-y-auto pb-32 md:pb-4">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Match</h1>
            <p className="text-sm text-muted-foreground">Find your next match</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden"
          >
            {/* Form Header */}
            <div className="px-6 pt-6 pb-4 text-center border-b border-border/50 bg-primary/5">
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Quick Match</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your details to start matching with strangers
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="guest-name">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest-name"
                    type="text"
                    placeholder="Enter a nickname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-age">Age</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guest-age"
                    type="number"
                    placeholder="Your age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="pl-10"
                    min={18}
                    max={99}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Must be 18 or older</p>
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="grid grid-cols-2 gap-2">
                  {genderOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGender(option.value)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        gender === option.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:bg-muted text-foreground"
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full h-11 mt-2">
                <Zap className="h-4 w-4 mr-2" />
                Start Matching
              </Button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <Shield className="h-3 w-3" />
                Your info is only shown to matched users
              </div>
            </form>

            {/* Login/Signup Section */}
            <div className="px-6 pb-6">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  Want to save your matches and chat history?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openLoginModal}
                    className="w-full"
                  >
                    Sign In
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openSignupModal}
                    className="w-full"
                  >
                    Sign Up
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tips */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: Shield, title: "Safe", desc: "Anonymous matching" },
              { icon: Users, title: "Real", desc: "Verified users only" },
              { icon: Zap, title: "Fast", desc: "Instant connections" },
            ].map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
                className="text-center p-3 rounded-xl bg-card border border-border/50"
              >
                <tip.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs font-medium text-foreground">{tip.title}</p>
                <p className="text-xs text-muted-foreground">{tip.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
