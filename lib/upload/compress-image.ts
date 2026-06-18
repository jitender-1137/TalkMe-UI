/**
 * Client-side image compression (WhatsApp-style) — runs in the browser before
 * upload to cut bandwidth, backend CPU and storage with minimal quality loss.
 *
 * Strategy:
 *  - Downscale so the longest edge is <= `maxEdge` (keeps aspect ratio).
 *  - Re-encode to WebP (falls back to JPEG) at `quality`.
 *  - Never make a file bigger: if the result isn't smaller, keep the original.
 *  - Safe no-ops: SSR, non-images, tiny files, and animated GIFs are returned
 *    untouched, and any failure falls back to the original file (uploads must
 *    never break because compression failed).
 */

export interface CompressImageOptions {
  /** Max width/height in px (longest edge). Default 1600. */
  maxEdge?: number
  /** Encoder quality 0–1. Default 0.75. */
  quality?: number
  /** Skip compression for files already below this size (bytes). Default 200KB. */
  minSize?: number
}

const KB = 1024

let cachedWebpSupport: boolean | null = null
/** Detect lossy-WebP encoding support once (Safari < 14 lacks it). */
function supportsWebp(): boolean {
  if (cachedWebpSupport !== null) return cachedWebpSupport
  try {
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    cachedWebpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp")
  } catch {
    cachedWebpSupport = false
  }
  return cachedWebpSupport
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

/**
 * Compress an image file. Returns a new (smaller) File, or the original file
 * unchanged when compression isn't applicable or wouldn't help.
 */
export async function compressImage(file: File, options: CompressImageOptions = {}): Promise<File> {
  const { maxEdge = 1600, quality = 0.75, minSize = 200 * KB } = options

  // Guards — return the original untouched.
  if (typeof window === "undefined" || typeof document === "undefined") return file
  if (!file.type.startsWith("image/")) return file
  // Animated GIFs would be flattened to a single frame — leave them alone.
  if (file.type === "image/gif") return file
  if (file.size <= minSize) return file

  try {
    const img = await loadImage(file)
    const { width, height } = img
    if (!width || !height) return file

    const scale = Math.min(1, maxEdge / Math.max(width, height))
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext("2d")
    if (!ctx) return file

    const useWebp = supportsWebp()
    const outType = useWebp ? "image/webp" : "image/jpeg"
    // JPEG has no alpha — paint a white background so transparency doesn't go black.
    if (!useWebp) {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, targetW, targetH)
    }
    ctx.drawImage(img, 0, 0, targetW, targetH)

    const blob = await canvasToBlob(canvas, outType, quality)
    if (!blob || blob.size >= file.size) return file // no gain → keep original

    const ext = useWebp ? "webp" : "jpg"
    const baseName = file.name.replace(/\.[^.]+$/, "")
    return new File([blob], `${baseName}.${ext}`, {
      type: outType,
      lastModified: Date.now(),
    })
  } catch {
    // Any failure (decode error, tainted canvas, etc.) → upload the original.
    return file
  }
}
