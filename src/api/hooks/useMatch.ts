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
    refetchInterval: 10 * 1000, // refresh count every 10 seconds
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
