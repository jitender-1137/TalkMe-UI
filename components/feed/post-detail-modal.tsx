"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Heart,
  MessageCircle,
  Bookmark,
  Send,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getAvatarUrl } from "@/lib/utils";
import { getMediaUrl } from "@/src/api/client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useLikePost,
  useUnlikePost,
  useBookmarkPost,
  useUnbookmarkPost,
  useUpdatePost,
  useDeletePost,
} from "@/src/api/hooks/useFeed";
import { CommentsPanel } from "./comments-panel";
import { CommentsSheet } from "./comments-sheet";
import { InstagramVideo } from "./instagram-video";

/** Normalized post shape the modal renders — built by callers from their data. */
export interface PostDetailModalPost {
  id: string;
  content?: string;
  mediaUrls: { url: string; type: "image" | "video" }[];
  author: { id: string; name: string; avatar?: string | null };
  createdAt: string | Date;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
}

interface PostDetailModalProps {
  post: PostDetailModalPost;
  isOwner?: boolean;
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
}

/**
 * Common "view post" modal — opened from the feed AND the profile grid. Shows
 * media + caption + like/comment/bookmark + comments, and (for the owner) an
 * edit-caption / delete menu.
 */
export function PostDetailModal({
  post,
  isOwner = false,
  onClose,
  onViewProfile,
}: PostDetailModalProps) {
  const isMobile = useIsMobile();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [caption, setCaption] = useState("");

  const likeMutation = useLikePost();
  const unlikeMutation = useUnlikePost();
  const bookmarkMutation = useBookmarkPost();
  const unbookmarkMutation = useUnbookmarkPost();
  const updatePostMutation = useUpdatePost();
  const deletePostMutation = useDeletePost();

  const postId = post.id;
  const firstMedia = post.mediaUrls?.[0];

  const handleLike = () => {
    if (post.isLiked) unlikeMutation.mutate(postId);
    else likeMutation.mutate(postId);
  };

  const handleBookmark = () => {
    if (post.isBookmarked) unbookmarkMutation.mutate(postId);
    else bookmarkMutation.mutate(postId);
  };

  const startEditCaption = () => {
    setCaption(post.content || "");
    setIsEditingCaption(true);
  };

  const saveCaption = () => {
    const next = caption.trim();
    if (next !== (post.content || "")) {
      updatePostMutation.mutate({ postId, content: next });
    }
    setIsEditingCaption(false);
  };

  const handleDelete = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this post? This cannot be undone.")
    ) {
      return;
    }
    deletePostMutation.mutate(postId, { onSuccess: onClose });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-200 bg-black/95 flex items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-card border border-border rounded-none md:rounded-xl overflow-hidden w-full max-w-[900px] h-dvh md:h-[85vh] flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: media. On mobile it FLEXES to fill the space between the top and
            the action/caption bar (Instagram-style) instead of being capped —
            otherwise portrait clips leave large empty areas. */}
        <div className="md:w-3/5 bg-black flex items-center justify-center border-border flex-1 min-h-0 md:flex-none md:border-r md:h-full">
          {firstMedia ? (
            firstMedia.type === "video" ? (
              <InstagramVideo
                src={getMediaUrl(firstMedia.url) || firstMedia.url}
                className="w-full h-full"
              />
            ) : (
              <img
                src={getMediaUrl(firstMedia.url)}
                alt=""
                className="w-full h-full object-contain"
              />
            )
          ) : (
            <div className="p-8 w-full h-full flex items-center justify-center bg-muted/60 text-center">
              <p className="text-foreground text-base md:text-lg italic font-light max-w-md">
                "{post.content}"
              </p>
            </div>
          )}
        </div>

        {/* Right: header, actions, caption, comments. Content-height on mobile
            (shrink-0) so the media above can flex to fill the screen. */}
        <div className="md:w-2/5 flex flex-col shrink-0 md:shrink md:h-full min-h-0 bg-card">
          {/* Header */}
          <div className="flex items-center gap-3 p-1.5 border-b border-border shrink-0">
            <Avatar
              className="h-9 w-9 cursor-pointer"
              onClick={() => {
                onClose();
                onViewProfile?.(post.author.id);
              }}
            >
              <AvatarImage src={getAvatarUrl(post.author.avatar ?? undefined)} />
              <AvatarFallback>{post.author.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p
                className="font-semibold text-sm text-foreground cursor-pointer hover:underline truncate"
                onClick={() => {
                  onClose();
                  onViewProfile?.(post.author.id);
                }}
              >
                {post.author.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground shrink-0"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[320]">
                  <DropdownMenuItem onClick={startEditCaption}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit caption
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 py-1 border-t border-border bg-muted/40 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={handleLike}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Heart className={cn("h-5 w-5", post.isLiked && "fill-red-500 text-red-500")} />
                  <span className="text-sm font-medium">{post.likesCount || 0}</span>
                </button>
                <button
                  onClick={isMobile ? () => setCommentsOpen(true) : undefined}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{post.commentsCount ?? 0}</span>
                </button>
              </div>
              <button
                onClick={handleBookmark}
                className="text-muted-foreground hover:text-yellow-500 transition-colors"
              >
                <Bookmark
                  className={cn("h-5 w-5", post.isBookmarked && "fill-yellow-500 text-yellow-500")}
                />
              </button>
            </div>
          </div>

          {/* Caption (below the actions) */}
          {(post.content || isEditingCaption) && (
            <div className="px-4 py-2 border-t border-border shrink-0">
              {isEditingCaption ? (
                <div className="space-y-2">
                  <Textarea
                    autoFocus
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a caption…"
                    className="min-h-20 max-h-40 overflow-y-auto resize-none text-sm bg-muted border-border"
                    maxLength={2200}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingCaption(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveCaption} disabled={updatePostMutation.isPending}>
                      {updatePostMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto">
                  <span className="font-semibold text-foreground mr-2">{post.author.name}</span>
                  {post.content}
                </div>
              )}
            </div>
          )}

          {isMobile ? (
            <button
              onClick={() => setCommentsOpen(true)}
              className="flex items-center gap-2 p-3 border-t border-border shrink-0 text-sm text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>
                {post.commentsCount
                  ? `View all ${post.commentsCount} comment${post.commentsCount > 1 ? "s" : ""}`
                  : "Add a comment…"}
              </span>
            </button>
          ) : (
            <div className="flex-1 min-h-0 border-t border-border">
              <CommentsPanel
                postId={postId}
                authorUsername={post.author.name}
                onUserClick={(id) => {
                  onClose();
                  if (id) onViewProfile?.(id);
                }}
              />
            </div>
          )}
        </div>
      </motion.div>

      {isMobile && (
        <CommentsSheet
          postId={postId}
          authorUsername={post.author.name}
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
          onUserClick={(id) => {
            setCommentsOpen(false);
            onClose();
            if (id) onViewProfile?.(id);
          }}
        />
      )}
    </motion.div>
  );
}
