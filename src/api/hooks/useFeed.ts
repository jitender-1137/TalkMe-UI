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

// Resolve a post from its shareable short code (used by the /post/{code} route).
export function usePostByCode(code: string | null) {
  return useQuery({
    queryKey: ["posts", "by-code", code ?? ""],
    queryFn: () => PostService.getPostByCode(code as string),
    enabled: typeof window !== "undefined" && Boolean(code) && Boolean(getAccessToken()),
    staleTime: 30 * 1000,
    retry: false,
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

// A comment lives in the top-level COMMENTS cache, or — if it's a reply — in the
// per-parent COMMENT_REPLIES cache. Mutations pass `parentId` so they touch the
// right one.
function commentsKey(postId: string, parentId?: string | null) {
  return parentId
    ? QUERY_KEYS.POSTS.COMMENT_REPLIES(postId, parentId)
    : QUERY_KEYS.POSTS.COMMENTS(postId)
}

// Replies of a single comment (Instagram-style "View N replies").
export function useCommentReplies(postId: string, commentId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.POSTS.COMMENT_REPLIES(postId, commentId),
    queryFn: ({ pageParam }) => PostService.getReplies(postId, commentId, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
    enabled: Boolean(postId) && Boolean(commentId) && enabled,
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, content, parentId }: { postId: string; content: string; parentId?: string }) =>
      PostService.createComment(postId, content, parentId),
    onSuccess: (_data, { postId, parentId }) => {
      if (parentId) {
        // A reply: refresh that thread's replies + the parent's replyCount.
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.COMMENT_REPLIES(postId, parentId) })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.COMMENTS(postId) })
      } else {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.COMMENTS(postId) })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.DETAIL(postId) })
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
    },
    onError: showErrorToast,
  })
}

export function useEditComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, commentId, content }: { postId: string; commentId: string; content: string; parentId?: string }) =>
      PostService.editComment(postId, commentId, content),
    onSuccess: (_data, { postId, parentId }) => {
      queryClient.invalidateQueries({ queryKey: commentsKey(postId, parentId) })
    },
    onError: showErrorToast,
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string; parentId?: string }) =>
      PostService.deleteComment(postId, commentId),
    onSuccess: (_data, { postId, commentId, parentId }) => {
      // Remove the comment from its cache (top-level list or the parent's replies)
      // immediately so it disappears without waiting for a refetch.
      queryClient.setQueryData(commentsKey(postId, parentId), (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: (page.items ?? []).filter((c: any) => c.id !== commentId),
            meta: page.meta
              ? { ...page.meta, total: Math.max(0, (page.meta.total ?? 1) - 1) }
              : page.meta,
          })),
        }
      })

      if (parentId) {
        // Deleting a reply → decrement the parent's replyCount in the top-level cache.
        patchCommentInCache(queryClient, QUERY_KEYS.POSTS.COMMENTS(postId), parentId, (c) => ({
          ...c,
          replyCount: Math.max(0, (c.replyCount ?? 1) - 1),
        }))
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.COMMENTS(postId) })
      } else {
        // Deleting a top-level comment → decrement the post's comment count.
        queryClient.setQueryData(QUERY_KEYS.POSTS.DETAIL(postId), (old: any) =>
          old ? { ...old, commentsCount: Math.max(0, (old.commentsCount ?? 1) - 1) } : old,
        )
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.DETAIL(postId) })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
      }
      showSuccessToast("Comment deleted")
    },
    onError: showErrorToast,
  })
}

// Optimistically patch a single comment inside a cached infinite-query (by key).
function patchCommentInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  key: readonly unknown[],
  commentId: string,
  patch: (c: any) => any,
) {
  queryClient.setQueryData(key, (old: any) => {
    if (!old?.pages) return old
    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        items: (page.items ?? []).map((c: any) => (c.id === commentId ? patch(c) : c)),
      })),
    }
  })
}

export function useLikeComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string; parentId?: string }) =>
      PostService.likeComment(postId, commentId),
    onMutate: async ({ postId, commentId, parentId }) => {
      const key = commentsKey(postId, parentId)
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData(key)
      patchCommentInCache(queryClient, key, commentId, (c) => ({
        ...c,
        likedByMe: true,
        likesCount: (c.likesCount ?? 0) + (c.likedByMe ? 0 : 1),
      }))
      return { prev, key }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev)
      showErrorToast(err)
    },
  })
}

export function useUnlikeComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string; parentId?: string }) =>
      PostService.unlikeComment(postId, commentId),
    onMutate: async ({ postId, commentId, parentId }) => {
      const key = commentsKey(postId, parentId)
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData(key)
      patchCommentInCache(queryClient, key, commentId, (c) => ({
        ...c,
        likedByMe: false,
        likesCount: Math.max(0, (c.likesCount ?? 0) - (c.likedByMe ? 1 : 0)),
      }))
      return { prev, key }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev)
      showErrorToast(err)
    },
  })
}

export function useUserPosts(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.POSTS.USER(userId),
    queryFn: () => PostService.getUserPosts(userId),
    enabled: Boolean(userId),
  })
}
