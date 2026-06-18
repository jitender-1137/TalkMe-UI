"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "./auth-context";
import { Turnstile } from "@/components/security/turnstile";
import {
  X,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AtSign,
  Calendar,
  HelpCircle,
  Users,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TermsModal } from "./terms-modal";
import { PrivacyModal } from "./privacy-modal";
import { CookieModal } from "./cookie-modal";

export function SignupModal() {
  const { showSignupModal, closeSignupModal, openLoginModal, signup, isSignupPending } = useAuth();

  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
  ];
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("18");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  // const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCookie, setShowCookie] = useState(false);

  // Field errors
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [ageError, setAgeError] = useState("");
  const [genderError, setGenderError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [agreedError, setAgreedError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNameError("");
    setEmailError("");
    setAgeError("");
    setGenderError("");
    setPasswordError("");
    setAgreedError("");

    let hasError = false;

    if (!name.trim()) {
      setNameError("Full name is required");
      hasError = true;
    }

    if (!email.trim()) {
      setEmailError("Email is required");
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    }

    const ageNum = parseInt(age, 10);
    if (!age) {
      setAgeError("Age is required");
      hasError = true;
    } else if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      setAgeError("You must be between 18 and 99 years old");
      hasError = true;
    }

    if (!gender) {
      setGenderError("Please select your gender");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      hasError = true;
    }

    if (!agreedToTerms) {
      setAgreedError("You must agree to the policies to proceed");
      hasError = true;
    }

    if (hasError) return;

    try {
      await signup(name, email, password, username, ageNum, gender, captchaToken, website);
    } catch (err: any) {
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    }
  };

  const handleSwitchToLogin = () => {
    setName("");
    setUsername("");
    setEmail("");
    setAge("");
    setGender("");
    setPassword("");
    setAgreedToTerms(false);
    setError("");
    setNameError("");
    setEmailError("");
    setAgeError("");
    setGenderError("");
    setPasswordError("");
    setAgreedError("");
    openLoginModal();
  };

  return (
    <>
      <AnimatePresence>
        {showSignupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto flex justify-center items-start bg-black/60 backdrop-blur-xs p-4 md:py-10"
            onClick={closeSignupModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 h-8 w-8"
                  onClick={closeSignupModal}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl overflow-hidden shadow-md">
                    <img
                      src="/apple-icon.png"
                      alt="TalkMe"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h1 className="text-xl font-bold">TalkMe</h1>
                </div>
                <h2 className="text-2xl font-bold text-foreground">Create account</h2>
                <p className="text-muted-foreground mt-1">Join the conversation today</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="relative mt-4">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError("");
                    }}
                    aria-invalid={!!nameError}
                    className="pl-10 h-10"
                  />
                  <Label
                    htmlFor="signup-name"
                    className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                  >
                    Full Name
                  </Label>
                  {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
                </div>

                <div className="relative mt-4">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setUsername(e.target.value.split("@")[0]);
                      if (emailError) setEmailError("");
                    }}
                    aria-invalid={!!emailError}
                    className="pl-10 h-10"
                  />
                  <Label
                    htmlFor="signup-email"
                    className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                  >
                    Email
                  </Label>
                  {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
                </div>

                <div className="relative mt-4">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    disabled
                    id="signup-username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    className="pl-10 h-10 bg-muted/10 cursor-not-allowed"
                  />
                  <Label
                    htmlFor="signup-username"
                    className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                  >
                    Username
                  </Label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                    <select
                      id="signup-age"
                      value={age}
                      onChange={(e) => {
                        setAge(e.target.value);
                        if (ageError) setAgeError("");
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
                      htmlFor="signup-age"
                      className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                    >
                      Age
                    </Label>
                    {ageError && <p className="text-xs text-destructive mt-1">{ageError}</p>}
                  </div>

                  <div className="relative">
                    <div
                      className={cn(
                        "grid grid-cols-2 gap-2 h-10 border border-border rounded-md px-2 items-center",
                        genderError && "border-destructive",
                      )}
                    >
                      {genderOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setGender(option.value);
                            if (genderError) setGenderError("");
                          }}
                          className={cn(
                            "flex items-center justify-center gap-1.5 px-2 border text-xs font-medium rounded-md transition-colors h-7 cursor-pointer",
                            gender === option.value
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : genderError
                                ? "border-destructive bg-transparent hover:bg-destructive/5 text-destructive"
                                : "border-border bg-transparent hover:bg-muted text-foreground",
                          )}
                        >
                          <Users className="h-3.5 w-3.5" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <Label className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all">
                      Gender
                    </Label>
                    {genderError && <p className="text-xs text-destructive mt-1">{genderError}</p>}
                  </div>
                </div>

                <div className="relative mt-4">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
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
                    htmlFor="signup-password"
                    className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
                  >
                    Password
                  </Label>
                  {passwordError && (
                    <p className="text-xs text-destructive mt-1">{passwordError}</p>
                  )}
                </div>

                {/* <div className="space-y-2">
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div> */}

                <div className="space-y-1 pt-2">
                  <div className="flex items-start gap-2">
                    <input
                      id="signup-agreed"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked);
                        if (agreedError) setAgreedError("");
                      }}
                      aria-invalid={!!agreedError}
                      className={cn(
                        "h-4 w-4 mt-0.5 rounded border-input text-primary focus:ring-primary bg-transparent cursor-pointer",
                        agreedError && "border-destructive text-destructive focus:ring-destructive",
                      )}
                    />
                    <Label
                      htmlFor="signup-agreed"
                      className="text-xs text-muted-foreground leading-normal cursor-pointer select-none"
                    >
                      I agree to the{" "}
                      <span
                        onClick={() => setShowTerms(true)}
                        className="text-primary hover:underline font-medium cursor-pointer"
                      >
                        Terms of Use
                      </span>{" "}
                      ,{" "}
                      <span
                        onClick={() => setShowPrivacy(true)}
                        className="text-primary hover:underline font-medium cursor-pointer"
                      >
                        Privacy Policy
                      </span>{" "}
                      and{" "}
                      <span
                        onClick={() => setShowCookie(true)}
                        className="text-primary hover:underline font-medium cursor-pointer"
                      >
                        Cookie Policy
                      </span>
                    </Label>
                  </div>
                  {agreedError && <p className="text-xs text-destructive mt-1">{agreedError}</p>}
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

                <Button type="submit" className="w-full h-11" disabled={isSignupPending}>
                  {isSignupPending ? "Creating account..." : "Create Account"}
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
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={handleSwitchToLogin}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <CookieModal isOpen={showCookie} onClose={() => setShowCookie(false)} />
    </>
  );
}
