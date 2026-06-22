"use client";

import { useState } from "react";
import { Lock, KeyRound, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/app-shell/auth-context";
import { useProfile } from "@/src/api/hooks/useProfile";
import { useChangePassword, useForgotPassword } from "@/src/api/hooks/useLogin";
import { UserService } from "@/src/api/services/user.service";
import { useConfirm } from "@/components/providers";
import { showSuccessToast, showErrorToast } from "@/src/api/error-handler";

/** #profile/account — account information, password management, and account actions. */
export function AccountPage() {
  const { logout } = useAuth();
  const { data: userProfile } = useProfile();
  const username = userProfile?.username || "user";

  const changePassword = useChangePassword();
  const forgotPassword = useForgotPassword();
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Log out?",
      message: "You'll need to sign in again to use your account.",
      confirmText: "Log Out",
      cancelText: "Cancel",
      destructive: true,
    });
    if (ok) logout();
  };

  const handleDeleteAccount = async () => {
    const ok = await confirm({
      title: "Delete account?",
      message:
        "Your account is deactivated immediately and permanently deleted after the recovery period. You can restore it any time before then by simply logging back in.",
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await UserService.deleteAccount();
      showSuccessToast(
        "Account scheduled for deletion",
        "Log back in within the recovery window to restore it.",
      );
      // Sign out everywhere — clears tokens locally and returns to the login screen.
      logout();
    } catch (e) {
      showErrorToast(e as Error);
    } finally {
      setDeleting(false);
    }
  };

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  const handlePasswordChange = () => {
    if (!currentPassword) {
      showErrorToast(new Error("Enter your current password"));
      return;
    }
    if (newPassword !== confirmPassword) {
      showErrorToast(new Error("New passwords do not match"));
      return;
    }
    if (newPassword.length < 6) {
      showErrorToast(new Error("New password is too short (min 6 characters)"));
      return;
    }
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      },
    );
  };

  const handleForgotPassword = () => {
    if (!forgotEmail) {
      showErrorToast(new Error("Enter your email address"));
      return;
    }
    forgotPassword.mutate(
      { email: forgotEmail },
      {
        onSuccess: () => {
          setForgotEmail("");
          setShowForgotPassword(false);
        },
      },
    );
  };

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto text-left">
      {/* Account info */}
      <div className="p-4 rounded-lg border border-border bg-card/40 space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Account Information</h3>
        <p className="text-sm text-muted-foreground">
          Username: <span className="text-foreground font-medium">@{username}</span>
        </p>
      </div>

      {showForgotPassword ? (
        <div className="space-y-4 p-4 rounded-lg border border-border bg-card/40 min-h-80">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <KeyRound className="h-5 w-5" />
            Reset Password
          </h3>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <div className="relative mt-4">
            <Input
              id="settings-forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="Enter your email"
              className="h-10"
            />
            <Label
              htmlFor="settings-forgot-email"
              className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
            >
              Email Address
            </Label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleForgotPassword}
              disabled={forgotPassword.isPending}
              className="flex-1 bg-primary hover:bg-primary/90 cursor-pointer"
            >
              {forgotPassword.isPending ? "Sending…" : "Send Reset Link"}
            </Button>
            <Button
              onClick={() => setShowForgotPassword(false)}
              variant="outline"
              className="flex-1 border-border hover:bg-card cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4 rounded-lg border border-border bg-card/40 min-h-80">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Lock className="h-5 w-5" />
            Change Password
          </h3>
          <div className="relative mt-4">
            <Input
              id="settings-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="h-10"
            />
            <Label
              htmlFor="settings-current-password"
              className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
            >
              Current Password
            </Label>
          </div>
          <div className="relative mt-4">
            <Input
              id="settings-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="h-10"
            />
            <Label
              htmlFor="settings-new-password"
              className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
            >
              New Password
            </Label>
          </div>
          <div className="relative mt-4">
            <Input
              id="settings-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="h-10"
            />
            <Label
              htmlFor="settings-confirm-password"
              className="absolute left-3 -top-2 z-10 px-1 bg-background text-xs font-semibold text-muted-foreground/80 cursor-pointer select-none leading-none transition-all"
            >
              Confirm New Password
            </Label>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-xs text-primary font-medium hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <Button
            onClick={handlePasswordChange}
            disabled={changePassword.isPending}
            className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
          >
            {changePassword.isPending ? "Updating…" : "Update Password"}
          </Button>
        </div>
      )}

      {/* Account actions */}
      <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Account Actions</h3>
        <Button variant="destructive" className="w-full gap-2 cursor-pointer" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
        <Button
          variant="outline"
          disabled={deleting}
          className="w-full gap-2 cursor-pointer border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDeleteAccount}
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Deleting…" : "Delete account"}
        </Button>
      </div>
    </div>
  );
}
