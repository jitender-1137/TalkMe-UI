"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "./auth-context";
import { X, User, Mail, Lock, Eye, EyeOff, AtSign, Calendar, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SignupModal() {
  const { showSignupModal, closeSignupModal, openLoginModal, signup, isSignupPending } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("18");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  // const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !username || !email || !age || !gender || !password) {
      setError("Please fill in all fields");
      return;
    }

    // if (password !== confirmPassword) {
    //   setError("Passwords do not match");
    //   return;
    // }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
      setError("Username must be 3-15 alphanumeric characters or underscores");
      return;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      setError("Please enter a valid age (18-99)");
      return;
    }

    if (!agreedToTerms) {
      setError("You must agree to the Terms of Use and Privacy Policy");
      return;
    }

    try {
      await signup(name, email, password, username, ageNum, gender);
      setName("");
      setUsername("");
      setEmail("");
      setAge("");
      setGender("");
      setPassword("");
      // setConfirmPassword("");
      setAgreedToTerms(false);
    } catch (err: any) {
      // Do not reset form on error
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err?.message) {
        setError(err.message);
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
    // setConfirmPassword("");
    setAgreedToTerms(false);
    setError("");
    openLoginModal();
  };

  return (
    <AnimatePresence>
      {showSignupModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex overflow-y-auto items-center justify-center bg-black p-4"
          onClick={closeSignupModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[75vh] overflow-y-auto"
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
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-primary-foreground font-bold text-lg">
                  T
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

              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    disabled
                    id="signup-username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setUsername(e.target.value.split("@")[0]);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-age">Age</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-age"
                      type="number"
                      placeholder="Age"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="pl-10"
                      min={18}
                      max={99}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-gender">Gender</Label>
                  <div className="relative">
                    <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <select
                      id="signup-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className={cn(
                        "pl-3 dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-9 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                        gender === "" ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      <option value="" disabled className="bg-card text-muted-foreground">
                        Select Gender
                      </option>
                      <option value="male" className="bg-card text-foreground">
                        Male
                      </option>
                      <option value="female" className="bg-card text-foreground">
                        Female
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
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

              <div className="flex items-start gap-2 pt-2">
                <input
                  id="signup-agreed"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-input text-primary focus:ring-primary bg-transparent cursor-pointer"
                />
                <Label
                  htmlFor="signup-agreed"
                  className="text-xs text-muted-foreground leading-normal cursor-pointer select-none"
                >
                  I agree to the{" "}
                  <span className="text-primary hover:underline font-medium cursor-pointer">
                    Terms of Use
                  </span>{" "}
                  and{" "}
                  <span className="text-primary hover:underline font-medium cursor-pointer">
                    Privacy Policy
                  </span>
                </Label>
              </div>

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
  );
}
