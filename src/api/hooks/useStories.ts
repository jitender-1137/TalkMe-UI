"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { StoriesService, type CreateStoryPayload } from "../services/stories.service"
import { QUERY_KEYS } from "../query-keys"
import { showSuccessToast, showErrorToast } from "../error-handler"
import { getAccessToken } from "../token-store"

export function useStories() {
  return useQuery({
    queryKey: QUERY_KEYS.STORIES.FEED,
    queryFn: () => StoriesService.getStories(),
    staleTime: 60 * 1000,
    enabled: typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

export function useCreateStory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateStoryPayload) => StoriesService.createStory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORIES.FEED })
      showSuccessToast("Story created successfully!")
    },
    onError: showErrorToast,
  })
}

export function useDeleteStory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (storyId: string) => StoriesService.deleteStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORIES.FEED })
      showSuccessToast("Story deleted")
    },
    onError: showErrorToast,
  })
}

export function useMarkStoryViewed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (storyId: string) => StoriesService.markStoryViewed(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORIES.FEED })
    },
    onError: showErrorToast,
  })
}

export function useStoryViewers(storyId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.STORIES.VIEWERS(storyId),
    queryFn: () => StoriesService.getStoryViewers(storyId),
    enabled: Boolean(storyId),
  })
}
