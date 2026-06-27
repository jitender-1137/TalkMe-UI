"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ContactService } from "../services/contact.service"
import { QUERY_KEYS } from "../query-keys"
import { showSuccessToast, showErrorToast } from "../error-handler"
import { getAccessToken, isGuestToken } from "../token-store"

/** Returns true when the current session belongs to a guest user. */
function useIsGuest(): boolean {
  const qc = useQueryClient()
  const me = qc.getQueryData<any>(QUERY_KEYS.AUTH.ME)
  // Prefer the token's own guest claim — known the instant we have a token, before
  // /auth/me resolves — so a guest refresh never briefly looks like a full user and
  // fires the (403-returning) friends/contacts requests. Fall back to cached profile.
  return isGuestToken() || me?.isGuest === true
}

// ── Query: contact list ───────────────────────────────────────────────────────
export function useContacts() {
  const isGuest = useIsGuest()
  return useQuery({
    queryKey: QUERY_KEYS.CONTACTS.LIST,
    queryFn: ContactService.getContacts,
    staleTime: 5 * 60 * 1000,
    enabled: !isGuest && typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

// ── Query: contact by ID ──────────────────────────────────────────────────────
export function useContact(contactId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.CONTACTS.DETAIL(contactId),
    queryFn: () => ContactService.getContactById(contactId),
    enabled: Boolean(contactId),
  })
}

// ── Query: contact requests ───────────────────────────────────────────────────
export function useContactRequests() {
  const isGuest = useIsGuest()
  return useQuery({
    queryKey: QUERY_KEYS.CONTACTS.REQUESTS,
    queryFn: ContactService.getContactRequests,
    enabled: !isGuest && typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

// ── Mutation: add contact ─────────────────────────────────────────────────────
export function useAddContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => ContactService.addContact(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.LIST })
      showSuccessToast("Friend request sent")
    },
    onError: (err: any) => {
      const msg = err?.message || ""
      if (msg.includes("Friend request already") || err?.status === 409) {
        showSuccessToast("Friend request already sent")
      } else {
        showErrorToast(err)
      }
    },
  })
}

// ── Mutation: remove contact ──────────────────────────────────────────────────
export function useRemoveContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (contactId: string) => ContactService.removeContact(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.LIST })
      showSuccessToast("Contact removed")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: accept contact request ─────────────────────────────────────────
export function useAcceptContactRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => ContactService.acceptContactRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.LIST })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.REQUESTS })
      showSuccessToast("Contact request accepted")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: decline contact request ────────────────────────────────────────
export function useDeclineContactRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => ContactService.declineContactRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.REQUESTS })
      showSuccessToast("Contact request declined")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: cancel contact request ─────────────────────────────────────────
export function useCancelContactRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestId: string) => ContactService.cancelContactRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOVER.LIST })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONTACTS.REQUESTS })
    },
    onError: showErrorToast,
  })
}
