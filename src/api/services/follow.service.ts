import apiClient from "../client"
import { unwrapPaginatedResponse } from "../response-handler"
import type { ApiResponse, PaginatedResponse, User as AuthUser } from "../types"

export const FollowService = {
  followUser: async (userUuid: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/follows/${userUuid}`)
    return response.data
  },

  unfollowUser: async (userUuid: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/follows/${userUuid}`)
    return response.data
  },

  removeFollower: async (followerUuid: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/follows/followers/${followerUuid}`)
    return response.data
  },

  getFollowers: async (userUuid: string, page = 0, size = 20): Promise<PaginatedResponse<AuthUser>> => {
    // Backend returns a Spring Page ({ content, ... }); normalize to { items, meta }.
    const response = await apiClient.get<ApiResponse<any>>(`/follows/${userUuid}/followers`, {
      params: { page, size },
    })
    return unwrapPaginatedResponse<AuthUser>(response)
  },

  getFollowing: async (userUuid: string, page = 0, size = 20): Promise<PaginatedResponse<AuthUser>> => {
    const response = await apiClient.get<ApiResponse<any>>(`/follows/${userUuid}/following`, {
      params: { page, size },
    })
    return unwrapPaginatedResponse<AuthUser>(response)
  },
}
