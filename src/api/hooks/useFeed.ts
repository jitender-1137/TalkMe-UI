"use client"

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

/** Fetch a single post by id — used to open a shared post from chat.
 *  Pass null to stay idle (no request). 404 (deleted post) surfaces as error. */
export function usePost(postId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.POSTS.DETAIL(postId ?? ""),
    queryFn: () => PostService.getPostById(postId as string),
    enabled: typeof window !== "undefined" && Boolean(postId) && Boolean(getAccessToken()),
    staleTime: 30 * 1000,
    retry: false, // a deleted post 404s — don't hammer it
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

export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      PostService.updatePost(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
      queryClient.invalidateQueries({ queryKey: ["posts"] })
      showSuccessToast("Caption updated")
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
      queryClient.invalidateQueries({ queryKey: ["posts"] })
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
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.POSTS.COMMENTS(postId),
    queryFn: ({ pageParam }) => PostService.getComments(postId, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
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

export function useEditComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, commentId, content }: { postId: string; commentId: string; content: string }) =>
      PostService.editComment(postId, commentId, content),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.COMMENTS(postId) })
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
