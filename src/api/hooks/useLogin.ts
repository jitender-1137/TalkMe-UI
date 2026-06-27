"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AuthService } from "../services/auth.service"
import { QUERY_KEYS } from "../query-keys"
import { showSuccessToast, showErrorToast } from "../error-handler"
import { getAccessToken, isGuestToken } from "../token-store"
import { ensureDbOwner, wipeLocalData } from "../db"
import { removePushSubscription } from "@/lib/push/push-manager"
import type {
  LoginCredentials,
  SignupCredentials,
  LoginResponse,
  SignupResponse,
  AuthUser,
  ForgotPasswordPayload,
  ChangePasswordPayload,
  GuestLoginPayload,
  Session,
  User,
} from "../types"

/** Returns true when the current session belongs to a guest user. */
function useIsGuest(): boolean {
  const qc = useQueryClient()
  const me = qc.getQueryData<any>(QUERY_KEYS.AUTH.ME)
  // Token claim first (race-free, see token-store.isGuestToken), cache as fallback.
  return isGuestToken() || me?.isGuest === true
}

// Helper to map AuthUser to User for profile caching
export const mapAuthUserToUser = (authUser: AuthUser): User => {
  return {
    id: authUser.id,
    name: authUser.name,
    username: authUser.username,
    email: authUser.email,
    avatar: authUser.avatar,
    bio: null,
    phone: null,
    isVerified: authUser.isVerified,
    isGuest: authUser.isGuest,
    isBlocked: false,
    presence: "online",
    lastSeen: null,
    createdAt: authUser.createdAt,
    updatedAt: authUser.createdAt,
    age: authUser.age || null,
    gender: authUser.gender || null,
    country: authUser.country || null,
    city: authUser.city || null,
    interests: authUser.interests || null,
  }
}

// ── Query: current authenticated user ────────────────────────────────────────
export function useMe() {
  return useQuery<AuthUser>({
    queryKey: QUERY_KEYS.AUTH.ME,
    queryFn: AuthService.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
    // Enable query even without token - it will try to refresh via 401 interceptor
    enabled: typeof window !== "undefined",
  })
}

// ── Mutation: login ───────────────────────────────────────────────────────────
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: AuthService.login,
    onSuccess: async (data) => {
      // Enforce per-account isolation BEFORE any cached data can render: if the
      // local DB still holds a previous user's chats/messages/media, wipe it.
      await ensureDbOwner(data.user.id)
      queryClient.setQueryData(QUERY_KEYS.AUTH.ME, data.user)
      queryClient.setQueryData(QUERY_KEYS.PROFILE.SELF, mapAuthUserToUser(data.user))
      showSuccessToast("Welcome back!", `Signed in as ${data.user.name}`)
    },
    onError: showErrorToast,
  })
}

// ── Mutation: signup ──────────────────────────────────────────────────────────
export function useSignup() {
  const queryClient = useQueryClient()

  return useMutation<SignupResponse, Error, SignupCredentials>({
    mutationFn: AuthService.signup,
    onSuccess: async (data) => {
      await ensureDbOwner(data.user.id)
      queryClient.setQueryData(QUERY_KEYS.AUTH.ME, data.user)
      queryClient.setQueryData(QUERY_KEYS.PROFILE.SELF, mapAuthUserToUser(data.user))
      showSuccessToast("Account created!", `Welcome, ${data.user.name}`)
    },
    onError: showErrorToast,
  })
}

// ── Mutation: guest login ─────────────────────────────────────────────────────
export function useGuestLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: GuestLoginPayload) => AuthService.loginAsGuest(payload),
    onSuccess: async (data) => {
      await ensureDbOwner(data.user.id)
      queryClient.setQueryData(QUERY_KEYS.AUTH.ME, data.user)
      queryClient.setQueryData(QUERY_KEYS.PROFILE.SELF, mapAuthUserToUser(data.user))
    },
    onError: showErrorToast,
  })
}

// ── Mutation: logout ──────────────────────────────────────────────────────────
export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Drop THIS device's push subscription first (needs auth) so a signed-out
      // device stops receiving push notifications. Best-effort and time-bounded —
      // it must NEVER block logout (e.g. if the service worker never becomes ready).
      await Promise.race([
        removePushSubscription().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ])
      return AuthService.logout()
    },
    onSuccess: async () => {
      // Purge ALL locally cached data so the next user on this browser can't
      // read the signed-out user's chats, messages, or media.
      await wipeLocalData()
      queryClient.clear()
      showSuccessToast("Signed out successfully")
    },
    onError: async () => {
      // Even if the server logout call fails, the user intends to sign out on
      // THIS device — local data must still be wiped so it can't leak.
      await wipeLocalData()
      queryClient.clear()
      showErrorToast(new Error("Signed out locally (server logout failed)"))
    },
  })
}

// ── Mutation: forgot password ─────────────────────────────────────────────────
export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => AuthService.forgotPassword(payload),
    onSuccess: () => {
      showSuccessToast("Email sent", "Check your inbox for a password reset link.")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: change password (authenticated) ────────────────────────────────
export function useChangePassword() {
  return useMutation<void, Error, ChangePasswordPayload>({
    mutationFn: (payload: ChangePasswordPayload) => AuthService.changePassword(payload),
    onSuccess: () => {
      showSuccessToast("Password updated", "Your password has been changed.")
    },
    onError: showErrorToast,
  })
}

// ── Query: active sessions ──────────────────────────────────────────────────────────
export function useSessions() {
  const isGuest = useIsGuest()
  return useQuery<Session[]>({
    queryKey: QUERY_KEYS.AUTH.SESSIONS,
    queryFn: AuthService.getSessions,
    staleTime: 60 * 1000,
    enabled: !isGuest && typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

// ── Mutation: revoke session ──────────────────────────────────────────────────
export function useRevokeSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => AuthService.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.SESSIONS })
      showSuccessToast("Session revoked")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: revoke all sessions ─────────────────────────────────────────────
export function useRevokeAllSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: AuthService.revokeAllSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.SESSIONS })
      showSuccessToast("All other sessions revoked")
    },
    onError: showErrorToast,
  })
}
