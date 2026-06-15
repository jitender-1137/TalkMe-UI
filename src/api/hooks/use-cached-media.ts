import { useEffect, useState } from "react";
import { db } from "../db";
import apiClient from "../client";

/**
 * Strip relative api path prefix (e.g. /api/v1) if present in the URL
 * because apiClient already prepends it via baseURL.
 */
function cleanRequestUrl(url: string): string {
  if (!url || url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  const apiPath = process.env.NEXT_PUBLIC_API_PATH || "/api/v1";
  if (url.startsWith(apiPath)) {
    return url.substring(apiPath.length);
  }
  if (url.startsWith("/api/v1")) {
    return url.substring(7);
  }
  return url;
}

/**
 * Generate a thumbnail blob from an image blob using Canvas.
 */
async function generateThumbnail(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.src = objectUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      // Target thumbnail width = 200px
      const targetWidth = 200;
      const scale = targetWidth / img.width;
      const targetHeight = img.height * scale;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob((thumbBlob) => {
          URL.revokeObjectURL(objectUrl);
          resolve(thumbBlob || blob);
        }, blob.type);
      } else {
        URL.revokeObjectURL(objectUrl);
        resolve(blob);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(blob);
    };
  });
}

/**
 * Manage storage space by evicting Least Recently Used (LRU) media
 * if storage usage exceeds 80% of quota.
 */
async function runLRUCacheEviction() {
  if (typeof navigator === "undefined" || !navigator.storage || !navigator.storage.estimate) {
    return;
  }

  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage && quota && usage > quota * 0.8) {
      console.log(`[Media Cache] Storage limit reached (usage: ${usage}B, quota: ${quota}B). Evicting LRU media...`);
      
      // Query media sorted by downloadedAt ascending (oldest first)
      const oldestMedia = await db.media.orderBy("downloadedAt").limit(50).toArray();
      
      for (const item of oldestMedia) {
        if (item.mediaType === "video" || item.mediaType === "document") {
          // Videos and documents are completely deleted
          await db.media.delete(item.mediaId);
        } else if (item.mediaType === "image") {
          if (item.thumbnailBlob) {
            // Keep thumbnails permanently: clear large blob and set it to null/empty
            // We update the row to save space but keep thumbnail
            await db.media.update(item.mediaId, {
              blob: new Blob([], { type: item.mimeType }) // Replace with empty blob to free space
            });
          } else {
            await db.media.delete(item.mediaId);
          }
        }
      }
    }
  } catch (err: any) {
    console.warn("[Media Cache] Error during LRU cache eviction:", err?.message || err, err);
  }
}

export function useCachedMedia(chatId: string, messageId: string, media: any) {
  const [resolvedUrl, setResolvedUrl] = useState(media?.url || "");
  const [resolvedThumbnail, setResolvedThumbnail] = useState(media?.thumbnail || "");

  useEffect(() => {
    if (!media || !media.url) return;

    // Use media.id or URL as unique identifier
    const mediaId = media.id || media.url;
    let active = true;
    let objectUrl: string | null = null;
    let thumbObjectUrl: string | null = null;

    const loadMedia = async () => {
      try {
        const cached = await db.media.get(mediaId);
        if (cached) {
          // If the cached item has a valid blob, create object URL
          if (cached.blob && cached.blob.size > 0) {
            objectUrl = URL.createObjectURL(cached.blob);
            if (active) setResolvedUrl(objectUrl);
          } else {
            // If main blob was evicted (size 0) but we have a remote URL fallback
            if (active) setResolvedUrl(media.url);
          }
          
          if (cached.thumbnailBlob) {
            thumbObjectUrl = URL.createObjectURL(cached.thumbnailBlob);
            if (active) setResolvedThumbnail(thumbObjectUrl);
          }
          return;
        }

        // Auto-cache images, audio, documents, and stickers on initial view
        const isVideo = media.type === "video";
        if (!isVideo) {
          // Fetch from network as Blob
          const response = await apiClient.get(cleanRequestUrl(media.url), { responseType: "blob" });
          const blob = response.data;

          let thumbnailBlob: Blob | undefined;
          if (media.type === "image") {
            thumbnailBlob = await generateThumbnail(blob);
          }

          // Run LRU check before inserting to prevent quota exceptions
          await runLRUCacheEviction();

          // Save to Dexie
          await db.media.put({
            mediaId,
            messageId,
            chatId,
            mediaType: media.type,
            mimeType: media.mimeType || blob.type,
            size: blob.size,
            fileName: media.fileName || "file",
            blob,
            thumbnailBlob,
            downloadedAt: new Date().toISOString()
          });

          objectUrl = URL.createObjectURL(blob);
          if (active) setResolvedUrl(objectUrl);

          if (thumbnailBlob) {
            thumbObjectUrl = URL.createObjectURL(thumbnailBlob);
            if (active) setResolvedThumbnail(thumbObjectUrl);
          }
        }
      } catch (err: any) {
        console.warn("[Media Cache] Error caching media:", err?.message || err, err);
        // Fallback to network URL on error
        if (active) {
          setResolvedUrl(media.url);
          setResolvedThumbnail(media.thumbnail || "");
        }
      }
    };

    loadMedia();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (thumbObjectUrl) URL.revokeObjectURL(thumbObjectUrl);
    };
  }, [chatId, messageId, media]);

  /**
   * Manually download and cache video blob on first playback.
   */
  const cacheVideo = async () => {
    if (!media || media.type !== "video") return;
    const mediaId = media.id || media.url;
    try {
      const existing = await db.media.get(mediaId);
      if (existing && existing.blob && existing.blob.size > 0) return; // already cached

      const response = await apiClient.get(cleanRequestUrl(media.url), { responseType: "blob" });
      const blob = response.data;

      await runLRUCacheEviction();

      await db.media.put({
        mediaId,
        messageId,
        chatId,
        mediaType: "video",
        mimeType: media.mimeType || blob.type,
        size: blob.size,
        fileName: media.fileName || "video.mp4",
        blob,
        downloadedAt: new Date().toISOString()
      });

      const objectUrl = URL.createObjectURL(blob);
      setResolvedUrl(objectUrl);
    } catch (err: any) {
      console.warn("[Media Cache] Error caching video:", err?.message || err, err);
    }
  };

  return { url: resolvedUrl, thumbnail: resolvedThumbnail, cacheVideo };
}
