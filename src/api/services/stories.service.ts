import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type { Story, StoryGroup, StoryViewer } from "../types/social.types"
import type { PaginatedResponse, PaginationParams } from "../types/api.types"

export interface CreateStoryPayload {
  file: File
  caption?: string
  privacy: "all" | "contacts" | "selected"
  selectedUserIds?: string[]
  duration?: number
}

export const StoriesService = {
  /** Create a new status/story. */
  createStory: async (payload: CreateStoryPayload): Promise<Story> => {
    const formData = new FormData()
    formData.append("file", payload.file)
    formData.append("privacy", payload.privacy)
    if (payload.caption) formData.append("caption", payload.caption)
    if (payload.duration) formData.append("duration", String(payload.duration))
    if (payload.selectedUserIds) {
      payload.selectedUserIds.forEach((id) => formData.append("selectedUserIds[]", id))
    }

    const response = await apiClient.post<{
      success: boolean
      message: string
      data: Story
      timestamp: string
    }>(ENDPOINTS.STATUS.CREATE, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return unwrapResponse(response)
  },

  /** Get stories feed (paginated list of StoryGroup). */
  getStories: async (params?: PaginationParams): Promise<PaginatedResponse<StoryGroup>> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: PaginatedResponse<StoryGroup>
      timestamp: string
    }>(ENDPOINTS.STATUS.LIST, { params })
    return unwrapResponse(response)
  },

  /** Delete a story by ID. */
  deleteStory: async (storyId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.STATUS.BY_ID(storyId))
  },

  /** Mark a story as viewed. */
  markStoryViewed: async (storyId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.STATUS.VIEW(storyId))
  },

  /** Get viewers of a story (own story only). */
  getStoryViewers: async (storyId: string): Promise<StoryViewer[]> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: StoryViewer[]
      timestamp: string
    }>(ENDPOINTS.STATUS.VIEWERS(storyId))
    return unwrapResponse(response)
  },

  /** React to a story. */
  reactToStory: async (storyId: string, emoji: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.STATUS.REACT(storyId), { emoji })
  },
}
