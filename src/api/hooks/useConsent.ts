"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../db"
import { ConsentService } from "../services/consent.service"
import { getAccessToken } from "../token-store"
import { showErrorToast } from "@/src/api"
import { useProfile } from "@/src/api"

type LocalStatus = "NONE" | "PENDING" | "GRANTED" | "DECLINED"

/** Upsert the local consent row (the source of truth the UI reads via useLiveQuery). */
export async function setLocalConsent(
  chatId: string,
  patch: Partial<{ status: LocalStatus; requestedByUserId: string; grantedAt: string; declineCount: number }>,
) {
  const existing = await db.consent_state.get(chatId)
  await db.consent_state.put({
    chatId,
    status: patch.status ?? existing?.status ?? "NONE",
    requestedByUserId: patch.requestedByUserId ?? existing?.requestedByUserId,
    requestedAt: existing?.requestedAt,
    grantedAt: patch.grantedAt ?? existing?.grantedAt,
    declineCount: patch.declineCount ?? existing?.declineCount ?? 0,
  })
}

/** Reactive consent state for a chat, hydrated from the API on open + WS updates. */
export function useChatConsent(chatId: string) {
  const { data: ownProfile } = useProfile()
  const myId = ownProfile?.id

  const { data: serverState } = useQuery({
    queryKey: ["consent", chatId],
    queryFn: async () => {
      const state = await ConsentService.getState(chatId)
      await setLocalConsent(chatId, {
        status: state.status,
        requestedByUserId: state.isRequester ? myId : state.awaitingMyAccept ? "__other__" : undefined,
        declineCount: state.declineCount,
      })
      return state
    },
    enabled: typeof window !== "undefined" && !!chatId && !!getAccessToken(),
    staleTime: 30 * 1000,
  })

  const local = useLiveQuery(() => (chatId ? db.consent_state.get(chatId) : undefined), [chatId])
  const status = (local?.status ?? "NONE") as LocalStatus
  const requestedByMe = !!myId && local?.requestedByUserId === myId
  const declineCount = local?.declineCount ?? 0
  // After 3 consecutive declines, neither side may request again (until granted).
  const limitReached = declineCount >= 3

  return {
    status,
    canSendExplicit: status === "GRANTED",
    isPending: status === "PENDING",
    declined: status === "DECLINED",
    requestedByMe,
    awaitingMyAccept: status === "PENDING" && !requestedByMe,
    // How many of MY messages are currently held pending consent (drives the
    // sender's "request consent" cue; persists across reloads via the server).
    heldForMe: serverState?.heldMessageCount ?? 0,
    declineCount,
    limitReached,
    // Derived from the live status: a request can start from NONE (default/after a
    // revoke) or DECLINED (try again), but never once the decline cap is hit.
    // Computing client-side avoids a stale server flag right after a revoke/decline.
    canRequest: (status === "NONE" || status === "DECLINED") && !limitReached,
    canRevoke: status === "GRANTED",
  }
}

export function useRequestConsent(chatId: string) {
  const { data: ownProfile } = useProfile()
  return useMutation({
    mutationFn: () => ConsentService.requestConsent(chatId),
    onSuccess: async (state) => {
      await setLocalConsent(chatId, {
        status: state.status,
        requestedByUserId: ownProfile?.id,
        declineCount: state.declineCount,
      })
    },
    onError: showErrorToast,
  })
}

export function useAcceptConsent(chatId: string) {
  return useMutation({
    mutationFn: () => ConsentService.acceptConsent(chatId),
    onSuccess: async (state) => {
      // Pre-consent (held) messages are discarded server-side; nothing to release
      // locally. Only future explicit messages flow once granted. Granting resets
      // the decline cap (server-side too).
      await setLocalConsent(chatId, {
        status: state.status,
        grantedAt: new Date().toISOString(),
        declineCount: state.declineCount,
      })
    },
    onError: showErrorToast,
  })
}

export function useDeclineConsent(chatId: string) {
  return useMutation({
    mutationFn: () => ConsentService.declineConsent(chatId),
    onSuccess: async (state) => {
      await setLocalConsent(chatId, { status: state.status, declineCount: state.declineCount })
    },
    onError: showErrorToast,
  })
}

export function useRevokeConsent(chatId: string) {
  return useMutation({
    mutationFn: () => ConsentService.revokeConsent(chatId),
    onSuccess: async (state) => {
      // Reset to default; the requester field is cleared server-side.
      await setLocalConsent(chatId, {
        status: state.status,
        requestedByUserId: "",
        declineCount: state.declineCount,
      })
    },
    onError: showErrorToast,
  })
}
