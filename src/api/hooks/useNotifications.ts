"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { NotificationService } from "../services/notification.service"
import { QUERY_KEYS } from "../query-keys"
import { showErrorToast } from "../error-handler"
import { getAccessToken } from "../token-store"

/** Returns true when the cached session belongs to a guest user. */
function useIsGuest(): boolean {
  const qc = useQueryClient()
  const me = qc.getQueryData<any>(QUERY_KEYS.AUTH.ME)
  return me?.isGuest === true
}

export function useNotifications() {
  const isGuest = useIsGuest()
  return useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS.LIST,
    queryFn: NotificationService.getNotifications,
    staleTime: 60 * 1000,
    enabled: !isGuest && typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => NotificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS.LIST })
    },
    onError: showErrorToast,
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => NotificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS.LIST })
    },
    onError: showErrorToast,
  })
}
