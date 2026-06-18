import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import { UploadService } from "./upload.service"
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
  /**
   * Create a new status/story.
   *
   * The backend story endpoint accepts JSON ({ mediaUrl, caption }), not the
   * raw file — uploading the binary directly produced a 415
   * "Content-Type 'multipart/form-data' is not supported". So we upload the
   * media first via the dedicated upload endpoint, then post the story with the
   * returned URL (same two-step pattern used for posts/avatars).
   */
  createStory: async (payload: CreateStoryPayload): Promise<Story> => {
    const mediaType = payload.file.type.startsWith("video") ? "video" : "image"
    const upload = await UploadService.uploadFile(payload.file, mediaType)

    const response = await apiClient.post<{
      success: boolean
      message: string
      data: Story
      timestamp: string
    }>(ENDPOINTS.STATUS.CREATE, {
      mediaUrl: upload.url,
      caption: payload.caption,
    })
    return unwrapResponse(response)
  },

  /**
   * Get active stories. The backend returns a FLAT list of stories (newest
   * first) visible to everyone; we group them by author into StoryGroup[] (the
   * shape the UI consumes), infer media type from the URL, and surface
   * `viewed`/`hasUnviewed` so the carousel can show the gradient ring only for
   * unseen authors. Returned as { items, meta } so existing `.items` consumers
   * keep working.
   */
  getStories: async (_params?: PaginationParams): Promise<PaginatedResponse<StoryGroup>> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: any[]
      timestamp: string
    }>(ENDPOINTS.STATUS.LIST)
    const raw = unwrapResponse<any[]>(response) ?? []

    // Group by author, preserving first-seen order (backend is newest-first).
    const groups = new Map<string, StoryGroup>()
    for (const s of raw) {
      const user = s.user ?? {}
      const userId: string = user.id ?? s.userId
      if (!userId) continue

      const mediaUrl: string = s.mediaUrl ?? ""
      const mediaType: "image" | "video" = /\.(mp4|webm|mov|m4v|ogg)$/i.test(mediaUrl)
        ? "video"
        : "image"

      const story: Story = {
        id: s.id,
        userId,
        userName: user.name ?? user.username ?? "User",
        userAvatar: user.avatar ?? null,
        mediaUrl,
        mediaType,
        caption: s.caption ?? undefined,
        viewsCount: s.viewsCount ?? 0,
        viewed: Boolean(s.viewedByMe),
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      }

      const existing = groups.get(userId)
      if (existing) {
        existing.stories.push(story)
      } else {
        groups.set(userId, {
          userId,
          userName: story.userName,
          userAvatar: story.userAvatar,
          stories: [story],
          hasUnviewed: false, // computed below
        })
      }
    }

    const items = Array.from(groups.values()).map((g) => ({
      ...g,
      // Play oldest → newest within an author (backend gave us newest-first).
      stories: [...g.stories].reverse(),
      hasUnviewed: g.stories.some((st) => !st.viewed),
    }))

    // Authors with unseen stories float to the front (Instagram-style).
    items.sort((a, b) => Number(b.hasUnviewed) - Number(a.hasUnviewed))

    return {
      items,
      meta: {
        page: 0,
        limit: items.length,
        total: items.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }
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
