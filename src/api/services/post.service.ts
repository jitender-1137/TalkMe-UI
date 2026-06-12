import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type { Post, Comment, CreatePostPayload } from "../types/social.types"
import type { PaginatedResponse, PaginationParams } from "../types/api.types"

export const PostService = {
  /** Fetch paginated posts feed. */
  getFeed: async (params?: PaginationParams): Promise<PaginatedResponse<Post>> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: PaginatedResponse<Post>
      timestamp: string
    }>(ENDPOINTS.POSTS.LIST, { params })
    return unwrapResponse(response)
  },

  /** Create a new post. */
  createPost: async (payload: CreatePostPayload): Promise<Post> => {
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: Post
      timestamp: string
    }>(ENDPOINTS.POSTS.CREATE, payload)
    return unwrapResponse(response)
  },

  /** Delete a post. */
  deletePost: async (postId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.POSTS.DELETE(postId))
  },

  /** Like a post. */
  likePost: async (postId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.POSTS.LIKE(postId))
  },

  /** Unlike a post. */
  unlikePost: async (postId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.POSTS.UNLIKE(postId))
  },

  /** Bookmark a post. */
  bookmarkPost: async (postId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.POSTS.BOOKMARK(postId))
  },

  /** Remove a bookmark. */
  unbookmarkPost: async (postId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.POSTS.BOOKMARK(postId))
  },

  /** Share a post. */
  sharePost: async (
    postId: string,
    payload: { targetType: "chat" | "profile" | "external"; targetId?: string }
  ): Promise<void> => {
    await apiClient.post(ENDPOINTS.POSTS.SHARE(postId), payload)
  },

  /** Fetch comments for a post. */
  getComments: async (postId: string): Promise<Comment[]> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: Comment[]
      timestamp: string
    }>(ENDPOINTS.POSTS.COMMENTS(postId))
    return unwrapResponse(response)
  },

  /** Add a comment to a post. */
  createComment: async (postId: string, content: string): Promise<Comment> => {
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: Comment
      timestamp: string
    }>(ENDPOINTS.POSTS.CREATE_COMMENT(postId), { content })
    return unwrapResponse(response)
  },

  /** Delete a comment. */
  deleteComment: async (postId: string, commentId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.POSTS.DELETE_COMMENT(postId, commentId))
  },

  /** Fetch a specific user's posts. */
  getUserPosts: async (userId: string, params?: PaginationParams): Promise<PaginatedResponse<Post>> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: PaginatedResponse<Post>
      timestamp: string
    }>(ENDPOINTS.POSTS.USER(userId), { params })
    return unwrapResponse(response)
  },
}
