import apiClient from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type { UploadResponse } from "../types/api.types"

export const UploadService = {
  /**
   * Upload a file directly using multipart/form-data.
   * Supports progress callback.
   */
  uploadFile: async (
    file: File,
    type: "image" | "video" | "audio" | "document" | "avatar",
    chatId?: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", type)
    if (chatId) {
      formData.append("chatId", chatId)
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
