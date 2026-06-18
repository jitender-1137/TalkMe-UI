"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MatchService } from "../services/match.service"
import { QUERY_KEYS } from "../query-keys"
import { showSuccessToast, showErrorToast } from "../error-handler"
import type { MatchFilters } from "../types/social.types"

export function useMatchOnlineCount() {
  return useQuery({
    queryKey: QUERY_KEYS.MATCH.ONLINE_COUNT,
    queryFn: () => MatchService.getOnlineMatchCount(),
    // Fetch once for the initial baseline; live updates arrive over WebSocket
    // (/topic/match/online) and are written straight into this cache by the
    // WebSocketProvider. No polling → no recurring backend/DB load.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export function useGetActiveSession() {
  return useQuery({
    queryKey: ["match", "active-session"],
    queryFn: () => MatchService.getActiveSession(),
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useStartMatching() {
  return useMutation({
    mutationFn: (filters: MatchFilters) => MatchService.startMatching(filters),
    onError: showErrorToast,
  })
}

export function useCancelMatching() {
  return useMutation({
    mutationFn: () => MatchService.cancelMatching(),
    onError: showErrorToast,
  })
}

export function useSkipStranger() {
  return useMutation({
    mutationFn: () => MatchService.skipStranger(),
    onError: showErrorToast,
  })
}

export function useEndMatching() {
  return useMutation({
    mutationFn: () => MatchService.endMatching(),
    onError: showErrorToast,
  })
}

export function useReportStranger() {
  return useMutation({
    mutationFn: ({ reason, details }: { reason: string; details?: string }) =>
      MatchService.reportStranger(reason, details),
    onSuccess: () => {
      showSuccessToast("Stranger reported successfully")
    },
    onError: showErrorToast,
  })
}

export function useBlockStranger() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => MatchService.blockStranger(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.BLOCKED })
      showSuccessToast("Stranger blocked")
    },
    onError: showErrorToast,
  })
}
