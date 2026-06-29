import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import { compressImage } from "@/lib/upload/compress-image"
import type { UploadResponse } from "../types/api.types"

/** Destination category — the server maps this to a media subfolder. */
export type UploadContext = "conversation" | "post" | "story" | "profile" | "stranger" | "lobby"

export interface UploadOptions {
  /** Folder category. Owner ids are derived server-side from auth (except conversation). */
  context?: UploadContext
  /** Only the conversation id is sent from the client (validated as a UUID server-side). */
  contextId?: string
  onProgress?: (progress: number) => void
}

export const UploadService = {
  /**
   * Upload a file directly using multipart/form-data. `opts.context` routes the
   * file into its media subfolder (conversations/{id}, posts/{uid}, …); progress
   * is reported via `opts.onProgress`.
   */
  uploadFile: async (
    file: File,
    type: "image" | "video" | "audio" | "document" | "avatar",
    opts: UploadOptions = {}
  ): Promise<UploadResponse> => {
    const { context, contextId, onProgress } = opts
    // WhatsApp-style: compress images in the browser before upload. Non-image
    // files (video/audio/document) and already-small images pass through
    // untouched (compressImage is a safe no-op for them).
    const toUpload = file.type.startsWith("image/") ? await compressImage(file) : file

    const formData = new FormData()
    formData.append("file", toUpload)
    formData.append("type", type)
    if (context) {
      formData.append("context", context)
    }
    if (contextId) {
      formData.append("contextId", contextId)
    }

    const response = await apiClient.post<{
      success: boolean
      message: string
      data: UploadResponse
      timestamp: string
    }>(
      ENDPOINTS.UPLOADS.DIRECT,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(percentCompleted)
          }
        },
      }
    )

    return unwrapResponse(response)
  },
}
