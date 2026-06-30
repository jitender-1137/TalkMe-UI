"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ProfileViewsService, type ProfileViewType } from "../services/profile-views.service"
import { QUERY_KEYS } from "../query-keys"

/**
 * Fire-and-forget recording of a profile/photo view. Never toasts or throws into
 * the UI — view tracking must never interrupt the person browsing.
 */
export function useRecordProfileView() {
  return useMutation({
    mutationFn: ({ userId, type }: { userId: string; type?: ProfileViewType }) =>
      ProfileViewsService.record(userId, type),
    onError: (err) => {
      console.warn("[ProfileViews] failed to record view", err)
    },
  })
}

/** The "who viewed my profile" list (most recent first). */
export function useProfileViews(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE_VIEWS.LIST,
    queryFn: () => ProfileViewsService.list(),
    enabled,
    staleTime: 30_000,
  })
}

/** Total + unseen viewer counts. Live updates also arrive over WebSocket. */
export function useProfileViewCount() {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE_VIEWS.COUNT,
    queryFn: () => ProfileViewsService.count(),
    staleTime: 30_000,
  })
}

/** Clear the "new viewers" badge (call when the user opens the views list). */
export function useMarkProfileViewsSeen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => ProfileViewsService.markSeen(),
    onSuccess: () => {
      queryClient.setQueryData(QUERY_KEYS.PROFILE_VIEWS.COUNT, (prev: any) =>
        prev ? { ...prev, unseen: 0 } : { total: 0, unseen: 0 },
      )
    },
  })
}
