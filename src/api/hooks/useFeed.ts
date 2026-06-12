"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PostService } from "../services/post.service"
import { QUERY_KEYS } from "../query-keys"
import { showSuccessToast, showErrorToast } from "../error-handler"
import type { CreatePostPayload } from "../types/social.types"
import { getAccessToken } from "../token-store"

export function useFeed() {
  return useQuery({
    queryKey: QUERY_KEYS.POSTS.FEED,
    queryFn: () => PostService.getFeed(),
    staleTime: 30 * 1000,
    enabled: typeof window !== "undefined" && Boolean(getAccessToken()),
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreatePostPayload) => PostService.createPost(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
      showSuccessToast("Post created successfully!")
    },
    onError: showErrorToast,
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => PostService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
      showSuccessToast("Post deleted")
    },
    onError: showErrorToast,
  })
}

export function useLikePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => PostService.likePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
    },
    onError: showErrorToast,
  })
}

export function useUnlikePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => PostService.unlikePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
    },
    onError: showErrorToast,
  })
}

export function useBookmarkPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => PostService.bookmarkPost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
      showSuccessToast("Post bookmarked")
    },
    onError: showErrorToast,
  })
}

export function useUnbookmarkPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => PostService.unbookmarkPost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
      showSuccessToast("Bookmark removed")
    },
    onError: showErrorToast,
  })
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.POSTS.COMMENTS(postId),
    queryFn: () => PostService.getComments(postId),
    enabled: Boolean(postId),
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      PostService.createComment(postId, content),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.COMMENTS(postId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
    },
    onError: showErrorToast,
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string }) =>
      PostService.deleteComment(postId, commentId),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.COMMENTS(postId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
      showSuccessToast("Comment deleted")
    },
    onError: showErrorToast,
  })
}

export function useUserPosts(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.POSTS.USER(userId),
    queryFn: () => PostService.getUserPosts(userId),
    enabled: Boolean(userId),
  })
}
