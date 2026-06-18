"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { FollowService } from "../services/follow.service"
import { showSuccessToast, showErrorToast } from "../error-handler"
import { QUERY_KEYS } from "../query-keys"

export function useFollowUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userUuid: string) => FollowService.followUser(userUuid),
    onSuccess: (_, userUuid) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.DETAIL(userUuid) })
      queryClient.invalidateQueries({ queryKey: ["followers", userUuid] })
      queryClient.invalidateQueries({ queryKey: ["following", userUuid] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.SELF })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.BY_ID(userUuid) })
      showSuccessToast("Following user!")
    },
    onError: showErrorToast,
  })
}

export function useUnfollowUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userUuid: string) => FollowService.unfollowUser(userUuid),
    onSuccess: (_, userUuid) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.DETAIL(userUuid) })
      queryClient.invalidateQueries({ queryKey: ["followers", userUuid] })
      queryClient.invalidateQueries({ queryKey: ["following", userUuid] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.SELF })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.BY_ID(userUuid) })
      showSuccessToast("Unfollowed user")
    },
    onError: showErrorToast,
  })
}

export function useFollowers(userUuid: string) {
  return useQuery({
    queryKey: ["followers", userUuid],
    queryFn: () => FollowService.getFollowers(userUuid),
    enabled: Boolean(userUuid),
  })
}

export function useFollowing(userUuid: string) {
  return useQuery({
    queryKey: ["following", userUuid],
    queryFn: () => FollowService.getFollowing(userUuid),
    enabled: Boolean(userUuid),
  })
}
