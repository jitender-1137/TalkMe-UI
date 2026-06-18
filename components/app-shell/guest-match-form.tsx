"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "./auth-context";
import { Turnstile } from "@/components/security/turnstile";
import { User, Calendar, Users, Shield, Zap, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function GuestMatchForm() {
  const { loginAsGuest, openLoginModal, openSignupModal, isAuthenticated, isGuestMatch } = useAuth();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");

  // Field errors
  const [nameError, setNameError] = useState("");
  const [ageError, setAgeError] = useState("");
  const [genderError, setGenderError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNameError("");
    setAgeError("");
    setGenderError("");

    let hasError = false;

    if (!name.trim()) {
      setNameError("Please enter your name");
      hasError = true;
    }

    const ageNum = parseInt(age);
    if (!age) {
      setAgeError("Please enter your age");
      hasError = true;
    } else if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      setAgeError("You must be between 18 and 99 years old");
      hasError = true;
    }

    if (!gender) {
      setGenderError("Please select your gender");
      hasError = true;
    }

    if (hasError) return;

    loginAsGuest(name.trim(), ageNum, gender, captchaToken, website);
  };

  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
  ];

  return (
    <div className="flex flex-col h-[100dvh] overflow-y-auto pb-32 md:pb-4">
      {/* Header */}
      {(isAuthenticated || isGuestMatch) && (
        <header className="sticky top-0 z-40 bg-background border-b border-border px-4 md:py-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Match</h1>
              <p className="text-sm text-muted-foreground">Find your next match</p>
            </div>
          </div>
        </header>
      )}

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
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl overflow-hidden shadow-md mx-auto mb-4">
                <img src="/apple-icon.png" alt="TalkMe" className="w-full h-full object-cover" />
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

              <div className="relative mt-4">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  id="guest-name"
                  type="text"
                  placeholder="Enter a nickname"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (nameError) setNameError("")
                  }}
                  aria-invalid={!!nameError}
                  className="pl-10 h-10"
                  maxLength={20}
                />
                <Label
                  htmlFor="guest-name"
                  className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                >
                  Display Name
                </Label>
                {nameError && (
                  <p className="text-xs text-destructive mt-1">{nameError}</p>
                )}
              </div>

              <div className="relative mt-4">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <select
                  id="guest-age"
                  value={age}
                  onChange={(e) => {
                    setAge(e.target.value)
                    if (ageError) setAgeError("")
                  }}
                  aria-invalid={!!ageError}
                  className={cn(
                    "pl-10 pr-8 dark:bg-input/30 border-input h-10 w-full min-w-0 rounded-md border bg-card py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm cursor-pointer appearance-none",
                    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
                    age === "" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  <option value="" disabled className="bg-card text-muted-foreground">
                    Select Age
                  </option>
                  {Array.from({ length: 82 }, (_, i) => i + 18).map((num) => (
                    <option key={num} value={num} className="bg-card text-foreground">
                      {num}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Label
                  htmlFor="guest-age"
                  className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                >
                  Age
                </Label>
                {ageError ? (
                  <p className="text-xs text-destructive mt-1">{ageError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Must be 18 or older</p>
                )}
              </div>

              <div className="relative mt-4">
                <div className={cn(
                  "grid grid-cols-2 gap-2 h-10 border border-border rounded-md px-2 items-center",
                  genderError && "border-destructive"
                )}>
                  {genderOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setGender(option.value)
                        if (genderError) setGenderError("")
                      }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-2 border text-xs font-medium rounded-md transition-colors h-7 cursor-pointer",
                        gender === option.value
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : genderError
                          ? "border-destructive bg-transparent hover:bg-destructive/5 text-destructive"
                          : "border-border bg-transparent hover:bg-muted text-foreground"
                      )}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {option.label}
                    </button>
                  ))}
                </div>
                <Label
                  className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                >
                  Gender
                </Label>
                {genderError && (
                  <p className="text-xs text-destructive mt-1">{genderError}</p>
                )}
              </div>

              {/* Honeypot — hidden from real users */}
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
  );
}
