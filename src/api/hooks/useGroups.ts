"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { GroupService } from "../services/group.service"
import { QUERY_KEYS } from "../query-keys"
import { showSuccessToast, showErrorToast } from "../error-handler"
import type { CreateGroupPayload, UpdateGroupPayload, AddGroupMemberPayload } from "../types"
import { getAccessToken } from "../token-store"

// ── Query: group list ─────────────────────────────────────────────────────────
export function useGroups() {
  return useQuery({
    queryKey: QUERY_KEYS.GROUPS.LIST,
    queryFn: GroupService.getGroups,
    staleTime: 2 * 60 * 1000,
    enabled: typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

// ── Query: single group ───────────────────────────────────────────────────────
export function useGroup(groupId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.GROUPS.DETAIL(groupId),
    queryFn: () => GroupService.getGroupById(groupId),
    enabled: Boolean(groupId),
  })
}

// ── Mutation: create group ────────────────────────────────────────────────────
export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateGroupPayload) => GroupService.createGroup(payload),
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.LIST })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Group created", group.name)
    },
    onError: showErrorToast,
  })
}

// ── Mutation: update group ────────────────────────────────────────────────────
export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateGroupPayload) => GroupService.updateGroup(groupId, payload),
    onSuccess: (group) => {
      queryClient.setQueryData(QUERY_KEYS.GROUPS.DETAIL(groupId), group)
      showSuccessToast("Group updated")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: delete group ────────────────────────────────────────────────────
export function useDeleteGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupId: string) => GroupService.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.LIST })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Group deleted")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: add group member ────────────────────────────────────────────────
export function useAddGroupMember(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddGroupMemberPayload) => GroupService.addMember(groupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.DETAIL(groupId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.MEMBERS(groupId) })
      showSuccessToast("Member added")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: remove group member ─────────────────────────────────────────────
export function useRemoveGroupMember(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => GroupService.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.DETAIL(groupId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.MEMBERS(groupId) })
      showSuccessToast("Member removed")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: promote to admin ────────────────────────────────────────────────
export function usePromoteToAdmin(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => GroupService.promoteToAdmin(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.DETAIL(groupId) })
      showSuccessToast("Member promoted to admin")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: demote from admin ───────────────────────────────────────────────
export function useDemoteFromAdmin(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => GroupService.demoteFromAdmin(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.DETAIL(groupId) })
      showSuccessToast("Admin revoked")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: leave group ─────────────────────────────────────────────────────
export function useLeaveGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupId: string) => GroupService.leaveGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.LIST })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Left group")
    },
    onError: showErrorToast,
  })
}
