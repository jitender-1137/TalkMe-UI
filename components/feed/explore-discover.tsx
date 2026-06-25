"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { useFeed } from "@/src/api/hooks/useFeed";
import { PostDetailModal } from "./post-detail-modal";

/** True when a media entry is a video (object mediaType or file extension). */
const isVideoMedia = (m: any) =>
  typeof m === "string"
    ? /\.(mp4|webm|mov)$/i.test(m)
    : (m?.mediaType || "").toLowerCase() === "video";

interface ExploreDiscoverProps {
  /** Open a user's profile (handled by the parent News dashboard). */
  onViewProfile?: (userId: string) => void;
}

export function ExploreDiscover({ onViewProfile }: ExploreDiscoverProps) {
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const { data: feedResponse } = useFeed();

  const mediaUrl = (m: any) => (typeof m === "string" ? m : m?.mediaUrl);

  // Popular posts: feed items that have media, shown as a grid.
  const popularPosts = useMemo(
    () => (feedResponse?.items || []).filter((p: any) => (p.media || []).length > 0).slice(0, 9),
    [feedResponse],
  );

  const openPost = popularPosts.find((p: any) => p.id === openPostId);

  return (
    <div className="space-y-7">
      {popularPosts.length > 0 ? (
        <section>
          <h2 className="text-base font-bold text-foreground mb-3">Popular Posts</h2>
          <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
            {popularPosts.map((post: any) => {
              const first = post.media[0];
              const url = mediaUrl(first);
              const video = isVideoMedia(first);
              return (
                <button
                  key={post.id}
                  onClick={() => setOpenPostId(post.id)}
                  className="relative aspect-square overflow-hidden bg-muted group cursor-pointer rounded-2xl border-4 border-border/50 hover:border-border/80 transition-all"
                >
                  {video ? (
                    <video
                      src={`${url}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover group-hover:brightness-90 transition-all"
                    />
                  ) : (
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover group-hover:brightness-90 transition-all"
                    />
                  )}
                  {video && (
                    <Play className="absolute top-1.5 right-1.5 h-4 w-4 text-white fill-white drop-shadow" />
                  )}
                  {post.media.length > 1 && !video && (
                    <span className="absolute top-1.5 right-1.5 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded-full">
                      +{post.media.length - 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
          No posts to explore yet
        </div>
      )}

      {/* Popular-post detail */}
      <AnimatePresence>
        {openPost && (
          <PostDetailModal
            post={{
              id: openPost.id,
              content: openPost.content,
              mediaUrls: (openPost.media || []).map((m: any) => {
                const url = mediaUrl(m);
                const isVideo =
                  (typeof m === "string" ? "" : m.mediaType || "").toLowerCase() === "video" ||
                  /\.(mp4|webm|mov)$/i.test(url || "");
                return { url, type: isVideo ? "video" : "image" };
              }),
              author: {
                id: openPost.userId,
                name: openPost.userName,
                avatar: openPost.userAvatar,
              },
              createdAt: openPost.createdAt,
              likesCount: openPost.likesCount || 0,
              commentsCount: openPost.commentsCount ?? 0,
              isLiked: !!openPost.isLiked,
              isBookmarked: !!openPost.isBookmarked,
            }}
            isOwner={false}
            onClose={() => setOpenPostId(null)}
            onViewProfile={(id) => {
              setOpenPostId(null);
              onViewProfile?.(id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
