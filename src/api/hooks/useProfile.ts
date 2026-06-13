"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { UserService } from "../services/user.service"
import { QUERY_KEYS } from "../query-keys"
import { showSuccessToast, showErrorToast } from "../error-handler"
import type { UpdateProfilePayload, PrivacySettings, AppSettings } from "../types"
import { getAccessToken } from "../token-store"

// ── Query: own profile ────────────────────────────────────────────────────────
export function useProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE.SELF,
    queryFn: UserService.getProfile,
    staleTime: 5 * 60 * 1000,
    enabled: typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

// ── Query: user by ID ─────────────────────────────────────────────────────────
export function useUserById(userId: string) {
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId)
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE.BY_ID(userId),
    queryFn: () => UserService.getUserById(userId),
    enabled: Boolean(userId) && isUuid,
    staleTime: 2 * 60 * 1000,
  })
}

// ── Mutation: update profile ──────────────────────────────────────────────────
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => UserService.updateProfile(payload),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(QUERY_KEYS.PROFILE.SELF, updatedUser)
      showSuccessToast("Profile updated")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: upload avatar ───────────────────────────────────────────────────
export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => UserService.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.SELF })
      showSuccessToast("Avatar updated")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: block user ──────────────────────────────────────────────────────
export function useBlockUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => UserService.blockUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.BLOCKED })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.BY_ID(userId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("User blocked")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: unblock user ────────────────────────────────────────────────────
export function useUnblockUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => UserService.unblockUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.BLOCKED })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.BY_ID(userId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("User unblocked")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: report user ──────────────────────────────────────────────────────
export function useReportUser() {
  return useMutation({
    mutationFn: ({ userId, reason, description }: { userId: string; reason: string; description: string }) =>
      UserService.reportUser(userId, reason, description),
    onSuccess: () => {
      showSuccessToast("Report submitted successfully")
    },
    onError: showErrorToast,
  })
}

// ── Query: blocked users ──────────────────────────────────────────────────────
export function useBlockedUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.CONTACTS.BLOCKED,
    queryFn: UserService.getBlockedUsers,
    enabled: typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

// ── Query: privacy settings ───────────────────────────────────────────────────
export function usePrivacySettings() {
  return useQuery({
    queryKey: QUERY_KEYS.SETTINGS.PRIVACY,
    queryFn: UserService.getPrivacySettings,
    enabled: typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

// ── Mutation: update privacy settings ────────────────────────────────────────
export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Partial<PrivacySettings>) =>
      UserService.updatePrivacySettings(settings),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.SETTINGS.PRIVACY, updated)
      showSuccessToast("Privacy settings saved")
    },
    onError: showErrorToast,
  })
}

// ── Query: app settings ───────────────────────────────────────────────────────
export function useAppSettings() {
  return useQuery({
    queryKey: QUERY_KEYS.SETTINGS.ALL,
    queryFn: UserService.getAppSettings,
    enabled: typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

// ── Mutation: update app settings ────────────────────────────────────────────
export function useUpdateAppSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Partial<AppSettings>) => UserService.updateAppSettings(settings),
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.SETTINGS.ALL, updated)
      showSuccessToast("Settings saved")
    },
    onError: showErrorToast,
  })
}

// ── Query: lobby users ────────────────────────────────────────────────────────
export function useLobbyUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.PRESENCE.LOBBY,
    queryFn: UserService.getLobbyUsers,
    staleTime: 10 * 1000,
    enabled: typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}
