// Lazily-loaded NSFWJS model (free, runs in the browser via TensorFlow.js).
// Dynamic-imported so TFJS + weights are NOT in the main bundle — they're fetched
// only the first time a user attaches an image.

let modelPromise: Promise<any> | null = null

export function loadNsfwModel(): Promise<any> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs")
      await tf.ready() // selects the WebGL backend
      const nsfwjs = await import("nsfwjs")
      // Default MobileNetV2. Weights are BUNDLED inside the nsfwjs package
      // (dist/models/mobilenet_v2, ~3.4MB) and required locally — no CDN/network
      // fetch — so they ship from our own origin. Cached after first load.
      return nsfwjs.load()
    })()
  }
  return modelPromise
}
