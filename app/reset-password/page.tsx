"use client";

import { useEffect, useState } from "react";
import { Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { AuthService } from "@/src/api/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyrightFooter } from "@/components/app-shell/copyright-footer";

type Status = "idle" | "submitting" | "done" | "error";

/**
 * Standalone password-reset page. Opened from the link in the reset email
 * (`/reset-password?token=...`). Submits the new password to the backend, which
 * validates the one-time token. Intentionally self-contained (no auth required).
 */
export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is invalid or missing its token.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setStatus("submitting");
    try {
      await AuthService.resetPassword({ token, password, confirmPassword: confirm });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(
        (err as { message?: string })?.message ||
          "This reset link is invalid or has expired. Please request a new one.",
      );
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 p-6 border-b border-border">
          <Lock className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Reset password</h1>
        </div>

        {status === "done" ? (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h2 className="text-lg font-semibold text-foreground">Password updated</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been changed. You can now sign in with your new password.
            </p>
            <Button asChild className="w-full mt-2">
              <a href="/">Go to sign in</a>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>

            <div className="relative mt-2">
              <Input
                id="reset-new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="h-10"
                autoComplete="new-password"
              />
              <Label
                htmlFor="reset-new-password"
                className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 select-none leading-none"
              >
                New Password
              </Label>
            </div>

            <div className="relative mt-2">
              <Input
                id="reset-confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="h-10"
                autoComplete="new-password"
              />
              <Label
                htmlFor="reset-confirm-password"
                className="absolute left-3 -top-2 z-10 px-1 bg-card text-xs font-semibold text-muted-foreground/80 select-none leading-none"
              >
                Confirm Password
              </Label>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={status === "submitting"}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {status === "submitting" ? "Updating…" : "Update password"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <a href="/" className="text-primary font-medium hover:underline">
                Back to sign in
              </a>
            </p>
          </form>
        )}
      </div>

      <CopyrightFooter className="mt-6" />
    </div>
  );
}
