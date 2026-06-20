/**
 * Client-side file validation for uploads (size + type).
 *
 * Validating on the client lets us reject an oversized/unsupported file BEFORE
 * spending bandwidth on the `/uploads` API and surfacing a generic backend
 * error. The backend servlet hard-limit is 100MB; we keep per-kind limits well
 * under that for a good experience.
 */

const MB = 1024 * 1024

/** Per-kind size limits (bytes). Tweak here if backend limits change. */
export const UPLOAD_LIMITS = {
  image: 10 * MB,
  video: 50 * MB,
  audio: 20 * MB,
  document: 25 * MB,
} as const

export type UploadKind = keyof typeof UPLOAD_LIMITS

/** Max playable length for uploaded videos (posts & stories), Instagram-style. */
export const VIDEO_MAX_DURATION_SECONDS = 90

export interface FileValidationResult {
  ok: boolean
  /** Human-readable reason when `ok` is false. */
  message?: string
}

function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${Math.round(bytes / MB)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

/** Infer the upload kind from a File's MIME type. */
export function getUploadKind(file: File): UploadKind {
  const mime = file.type || ""
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  if (mime.startsWith("image/")) return "image"
  return "document"
}

/**
 * Validate a file's size (and optionally that it matches the expected kinds).
 *
 * @param file          The picked file.
 * @param allowedKinds  Optional whitelist of allowed kinds (e.g. ["image","video"]
 *                      for stories). When provided, a mismatching file is rejected.
 */
export function validateUploadFile(
  file: File,
  allowedKinds?: UploadKind[],
): FileValidationResult {
  if (!file) return { ok: false, message: "No file selected." }

  const kind = getUploadKind(file)

  if (allowedKinds && !allowedKinds.includes(kind)) {
    const labels = allowedKinds.join(" or ")
    return { ok: false, message: `Unsupported file type. Please choose a ${labels} file.` }
  }

  const limit = UPLOAD_LIMITS[kind]
  if (file.size > limit) {
    return {
      ok: false,
      message: `This ${kind} is ${formatBytes(file.size)}. The maximum allowed ${kind} size is ${formatBytes(limit)}.`,
    }
  }

  return { ok: true }
}

/**
 * Validate that a video isn't longer than `maxSeconds` (default 90s).
 * Reads the file's metadata via a detached <video> element — no upload needed.
 * Non-video files pass through. Fails OPEN (resolves ok) if duration can't be
 * read, so a metadata quirk never blocks a legitimate upload; the only hard
 * rejection is a video we can positively measure as too long.
 */
export function validateVideoDuration(
  file: File,
  maxSeconds: number = VIDEO_MAX_DURATION_SECONDS,
): Promise<FileValidationResult> {
  if (!file || !file.type.startsWith("video/")) {
    return Promise.resolve({ ok: true })
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    const done = (result: FileValidationResult) => {
      URL.revokeObjectURL(url)
      resolve(result)
    }
    video.onloadedmetadata = () => {
      const duration = video.duration
      if (!Number.isFinite(duration)) {
        done({ ok: true })
        return
      }
      // 0.5s slack for container-reported rounding.
      if (duration > maxSeconds + 0.5) {
        done({
          ok: false,
          message: `This video is ${Math.round(duration)}s long. Videos can be at most ${maxSeconds} seconds.`,
        })
      } else {
        done({ ok: true })
      }
    }
    video.onerror = () => done({ ok: true })
    video.src = url
  })
}
