import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse, unwrapPaginatedResponse } from "../response-handler"
import type { Post, Comment, CreatePostPayload } from "../types/social.types"
import type { PaginatedResponse, PaginationParams } from "../types/api.types"
import type { User as AuthUser } from "../types"

/** Shape returned by the backend PostCommentResponse. */
export interface PostCommentDTO {
  id: string
  userId?: string
  username: string
  name: string
  profileImage?: string | null
  content: string
  createdAt: string
  likesCount: number
  likedByMe: boolean
  parentId?: string | null
  replyCount: number
}

export const PostService = {
  /** Fetch paginated posts feed. */
  getFeed: async (params?: PaginationParams): Promise<PaginatedResponse<Post>> => {
    const response = await apiClient.get<any>(ENDPOINTS.POSTS.LIST, { params })
    return unwrapPaginatedResponse(response)
  },

  /** Fetch a single post by id (used to open a shared post from chat). */
  getPostById: async (postId: string): Promise<Post> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: Post
      timestamp: string
    }>(ENDPOINTS.POSTS.BY_ID(postId))
    return unwrapResponse(response)
  },

  /** Fetch a single post by its shareable short code (Instagram-style link). */
  getPostByCode: async (code: string): Promise<Post> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: Post
      timestamp: string
    }>(ENDPOINTS.POSTS.BY_CODE(code))
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

  /** Update a post's caption (owner only). */
  updatePost: async (postId: string, content: string): Promise<Post> => {
    const response = await apiClient.put<{
      success: boolean
      message: string
      data: Post
      timestamp: string
    }>(ENDPOINTS.POSTS.UPDATE(postId), { content })
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

  /** Fetch the list of users who liked a post (paginated, newest first). */
  getPostLikes: async (
    postId: string,
    page = 0,
    size = 30,
  ): Promise<PaginatedResponse<AuthUser>> => {
    const response = await apiClient.get<any>(ENDPOINTS.POSTS.LIKES(postId), {
      params: { page, size },
    })
    return unwrapPaginatedResponse<AuthUser>(response)
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

  /** Fetch a page of comments for a post (cursor/page-based for infinite scroll). */
  getComments: async (
    postId: string,
    page = 0,
    size = 15,
  ): Promise<PaginatedResponse<PostCommentDTO>> => {
    const response = await apiClient.get<any>(ENDPOINTS.POSTS.COMMENTS(postId), {
      params: { page, size },
    })
    return unwrapPaginatedResponse<PostCommentDTO>(response)
  },

  /** Add a comment to a post (pass parentId to post it as a reply). */
  createComment: async (
    postId: string,
    content: string,
    parentId?: string,
  ): Promise<PostCommentDTO> => {
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: PostCommentDTO
      timestamp: string
    }>(ENDPOINTS.POSTS.CREATE_COMMENT(postId), { content, parentId })
    return unwrapResponse(response)
  },

  /** Fetch a page of replies for a comment. */
  getReplies: async (
    postId: string,
    commentId: string,
    page = 0,
    size = 10,
  ): Promise<PaginatedResponse<PostCommentDTO>> => {
    const response = await apiClient.get<any>(ENDPOINTS.POSTS.COMMENTS(postId) + `/${commentId}/replies`, {
      params: { page, size },
    })
    return unwrapPaginatedResponse<PostCommentDTO>(response)
  },

  /** Edit one of the current user's comments. */
  editComment: async (postId: string, commentId: string, content: string): Promise<PostCommentDTO> => {
    const response = await apiClient.put<{
      success: boolean
      message: string
      data: PostCommentDTO
      timestamp: string
    }>(ENDPOINTS.POSTS.EDIT_COMMENT(postId, commentId), { content })
    return unwrapResponse(response)
  },

  /** Delete a comment. */
  deleteComment: async (postId: string, commentId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.POSTS.DELETE_COMMENT(postId, commentId))
  },

  /** Like a comment. */
  likeComment: async (postId: string, commentId: string): Promise<void> => {
    await apiClient.post(ENDPOINTS.POSTS.LIKE_COMMENT(postId, commentId))
  },

  /** Unlike a comment. */
  unlikeComment: async (postId: string, commentId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.POSTS.UNLIKE_COMMENT(postId, commentId))
  },

  /** Fetch a specific user's posts. */
  getUserPosts: async (userId: string, params?: PaginationParams): Promise<PaginatedResponse<Post>> => {
    const response = await apiClient.get<any>(ENDPOINTS.POSTS.USER(userId), { params })
    return unwrapPaginatedResponse(response)
  },
}
