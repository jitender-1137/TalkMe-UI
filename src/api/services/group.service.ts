import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type { Group, CreateGroupPayload, UpdateGroupPayload, AddGroupMemberPayload } from "../types"

export const GroupService = {
  /** Fetch all groups the current user belongs to. */
  getGroups: async (): Promise<Group[]> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: Group[]; timestamp: string }>(
      ENDPOINTS.GROUPS.LIST,
    )
    return unwrapResponse(response)
  },

  /** Fetch a single group by ID. */
  getGroupById: async (groupId: string): Promise<Group> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: Group; timestamp: string }>(
      ENDPOINTS.GROUPS.BY_ID(groupId),
    )
    return unwrapResponse(response)
  },

  /** Create a new group. */
  createGroup: async (payload: CreateGroupPayload): Promise<Group> => {
    const response = await apiClient.post<{ success: boolean; message: string; data: Group; timestamp: string }>(
      ENDPOINTS.GROUPS.CREATE,
      payload,
    )
    return unwrapResponse(response)
  },

  /** Update group info (name, description, avatar). */
  updateGroup: async (groupId: string, payload: UpdateGroupPayload): Promise<Group> => {
    const response = await apiClient.patch<{ success: boolean; message: string; data: Group; timestamp: string }>(
      ENDPOINTS.GROUPS.UPDATE(groupId),
      payload,
    )
    return unwrapResponse(response)
  },

  /** Delete a group (owner only). */
  deleteGroup: async (groupId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.GROUPS.DELETE(groupId))
  },

  /** Add a member to the group. */
  addMember: async (groupId: string, payload: AddGroupMemberPayload): Promise<Group> => {
    const response = await apiClient.post<{ success: boolean; message: string; data: Group; timestamp: string }>(
      ENDPOINTS.GROUPS.ADD_MEMBER(groupId),
      payload,
    )
    return unwrapResponse(response)
  },

  /** Remove a member from the group. */
  removeMember: async (groupId: string, userId: string): Promise<Group> => {
    const response = await apiClient.delete<{ success: boolean; message: string; data: Group; timestamp: string }>(
      ENDPOINTS.GROUPS.REMOVE_MEMBER(groupId, userId),
    )
    return unwrapResponse(response)
  },

  /** Promote a member to admin. */
  promoteToAdmin: async (groupId: string, userId: string): Promise<Group> => {
    const response = await apiClient.post<{ success: boolean; message: string; data: Group; timestamp: string }>(
      ENDPOINTS.GROUPS.PROMOTE(groupId, userId),
    )
    return unwrapResponse(response)
  },

  /** Demote an admin back to member. */
  demoteFromAdmin: async (groupId: string, userId: string): Promise<Group> => {
    const response = await apiClient.post<{ success: boolean; message: string; data: Group; timestamp: string }>(
      ENDPOINTS.GROUPS.DEMOTE(groupId, userId),
    )
    return unwrapResponse(response)
  },

  /** Leave a group. */
  leaveGroup: async (groupId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.GROUPS.LEAVE(groupId))
  },

  /** Generate or fetch the group invite link. */
  getInviteLink: async (groupId: string): Promise<{ link: string }> => {
    const response = await apiClient.get<{ success: boolean; message: string; data: { link: string }; timestamp: string }>(
      ENDPOINTS.GROUPS.INVITE_LINK(groupId),
    )
    return unwrapResponse(response)
  },
}
