import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type { Contact, FriendRequest } from "../types"

export const ContactService = {
  /** Fetch the current user's contact list. */
  getContacts: async (): Promise<Contact[]> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: Contact[]; timestamp: string }>(
      ENDPOINTS.CONTACTS.LIST,
    )
    return unwrapResponse(response)
  },

  /** Fetch a single contact by ID. */
  getContactById: async (contactId: string): Promise<Contact> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: Contact; timestamp: string }>(
      ENDPOINTS.CONTACTS.BY_ID(contactId),
    )
    return unwrapResponse(response)
  },

  /** Add a user to contacts. */
  addContact: async (userId: string): Promise<Contact> => {
    const response = await apiClient.post<{ success: boolean; message: string; data: Contact; timestamp: string }>(
      ENDPOINTS.CONTACTS.ADD,
      { receiverId: userId },
    )
    return unwrapResponse(response)
  },

  /** Remove a contact. */
  removeContact: async (contactId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.CONTACTS.REMOVE(contactId))
  },

  /** Fetch incoming contact requests. */
  getContactRequests: async (): Promise<FriendRequest[]> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: FriendRequest[]; timestamp: string }>(
      ENDPOINTS.CONTACTS.REQUESTS,
    )
    return unwrapResponse(response)
  },

  /** Accept a contact request. */
  acceptContactRequest: async (requestId: string): Promise<Contact> => {
    const response = await apiClient.put<{ success: boolean; message: string; data: Contact; timestamp: string }>(
      ENDPOINTS.CONTACTS.ACCEPT(requestId),
    )
    return unwrapResponse(response)
  },

  /** Decline a contact request. */
  declineContactRequest: async (requestId: string): Promise<void> => {
    await apiClient.put(ENDPOINTS.CONTACTS.DECLINE(requestId))
  },

  /** Cancel a sent contact request. */
  cancelContactRequest: async (requestId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.CONTACTS.CANCEL(requestId))
  },
}
