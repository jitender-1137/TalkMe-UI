"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DiscoverService, type DiscoverParams } from "../services/discover.service"
import { QUERY_KEYS } from "../query-keys"
import { showSuccessToast, showErrorToast } from "../error-handler"
import { getAccessToken } from "../token-store"

export function useDiscoverProfiles(params?: DiscoverParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...QUERY_KEYS.DISCOVER.LIST, params],
    queryFn: () => DiscoverService.getDiscoverProfiles(params),
    staleTime: 30 * 1000,
    // Caller can gate the fetch (e.g. until persisted filters have loaded) on top
    // of the always-required window + auth-token checks.
    enabled:
      (options?.enabled ?? true) && typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

export function useLikeDiscoverProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => DiscoverService.likeDiscoverProfile(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOVER.LIST })
      showSuccessToast("Liked profile!")
    },
    onError: showErrorToast,
  })
}

export function useUnlikeDiscoverProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => DiscoverService.unlikeDiscoverProfile(userId),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOVER.LIST })
    },
    onError: showErrorToast,
  })
}

export function useSuggestedFriends() {
  return useQuery({
    queryKey: QUERY_KEYS.DISCOVER.SUGGESTIONS,
    queryFn: () => DiscoverService.getSuggestedFriends(),
    staleTime: 60 * 1000,
    enabled: typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

export function useMutualFriends(userId: string) {
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId)
  return useQuery({
    queryKey: [...QUERY_KEYS.CONTACTS.LIST, userId, "mutual"],
    queryFn: () => DiscoverService.getMutualFriends(userId),
    enabled: Boolean(userId) && isUuid,
  })
}
