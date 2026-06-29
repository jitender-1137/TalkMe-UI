// Free, client-side NSFW pre-check (advisory UX only — the server is authoritative).
// Fails OPEN: any model/decoding error or timeout returns isNsfw=false so a genuine
// upload is never blocked by a flaky model load.

import { loadNsfwModel } from "./nsfw-model"

export interface NsfwResult {
  isNsfw: boolean
  score: number
  reason?: "image" | "video"
}

const THRESHOLD = 0.6
const TIMEOUT_MS = 4000

function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), TIMEOUT_MS)),
  ])
}

function scoreFrom(preds: Array<{ className: string; probability: number }>): number {
  const get = (k: string) => preds.find((p) => p.className === k)?.probability ?? 0
  return get("Porn") + get("Hentai") + 0.5 * get("Sexy")
}

async function classifyElement(el: HTMLImageElement | HTMLCanvasElement): Promise<number> {
  const model = await loadNsfwModel()
  const preds = await model.classify(el as any)
  return scoreFrom(preds)
}

export async function checkImageNsfw(file: File): Promise<NsfwResult> {
  const run = (async (): Promise<NsfwResult> => {
    const url = URL.createObjectURL(file)
    try {
      const img = await loadImage(url)
      const score = await classifyElement(img)
      return { isNsfw: score >= THRESHOLD, score, reason: "image" }
    } finally {
      URL.revokeObjectURL(url)
    }
  })()
  return withTimeout(run, { isNsfw: false, score: 0, reason: "image" }).catch(() => ({
    isNsfw: false,
    score: 0,
    reason: "image",
  }))
}

export async function checkVideoNsfw(file: File): Promise<NsfwResult> {
  const run = (async (): Promise<NsfwResult> => {
    const url = URL.createObjectURL(file)
    try {
      const frames = await sampleVideoFrames(url, 4)
      let max = 0
      for (const canvas of frames) {
        max = Math.max(max, await classifyElement(canvas))
        if (max >= THRESHOLD) break
      }
      return { isNsfw: max >= THRESHOLD, score: max, reason: "video" }
    } finally {
      URL.revokeObjectURL(url)
    }
  })()
  return withTimeout(run, { isNsfw: false, score: 0, reason: "video" }).catch(() => ({
    isNsfw: false,
    score: 0,
    reason: "video",
  }))
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function sampleVideoFrames(url: string, count: number): Promise<HTMLCanvasElement[]> {
  const video = document.createElement("video")
  video.muted = true
  video.src = url
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error("video load failed"))
  })
  const duration = isFinite(video.duration) ? video.duration : 0
  const canvases: HTMLCanvasElement[] = []
  for (let i = 1; i <= count; i++) {
    const t = duration > 0 ? (duration * i) / (count + 1) : 0
    await seek(video, t)
    const canvas = document.createElement("canvas")
    canvas.width = 224
    canvas.height = 224
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvases.push(canvas)
    }
  }
  return canvases
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked)
      resolve()
    }
    video.addEventListener("seeked", onSeeked)
    video.currentTime = time
  })
}
