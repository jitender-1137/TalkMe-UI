"use client"

import { PushService, type InstallationType } from "@/src/api/services/push.service"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return ""
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Per-device push opt-out flag (localStorage). When the user explicitly disables
 * push, the browser permission stays "granted", so NotificationSetup would silently
 * re-subscribe on the next app open. This flag records the user's intent so we DON'T
 * auto-resubscribe until they turn it back on. Device-local on purpose — push is
 * per-device, so disabling on one device must not affect the others.
 */
const PUSH_OPT_OUT_KEY = "talkme:push-opt-out"

export function setPushOptOut(optedOut: boolean): void {
  try {
    if (optedOut) localStorage.setItem(PUSH_OPT_OUT_KEY, "1")
    else localStorage.removeItem(PUSH_OPT_OUT_KEY)
  } catch {
    /* ignore */
  }
}

export function isPushOptedOut(): boolean {
  try {
    return localStorage.getItem(PUSH_OPT_OUT_KEY) === "1"
  } catch {
    return false
  }
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

/**
 * navigator.serviceWorker.ready never resolves if no service worker ever activates
 * (registration failed, dev without SW, etc.). Awaiting it directly can hang the
 * caller forever — which freezes the Settings push toggle (its busy flag never
 * clears) and previously hung logout. Always go through this bounded helper.
 */
async function swReady(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ])
}

/**
 * Ensure a Web Push subscription exists for an installed PWA and is saved on
 * the backend. Safe to call repeatedly (idempotent). Returns true if a
 * subscription is active.
 *
 * Does NOT prompt for permission unless `requestPermission` is true — the
 * prompt should be triggered by a user gesture (e.g. a settings toggle).
 */
export async function ensurePushSubscription(
  installationType: InstallationType,
  requestPermission = false,
): Promise<boolean> {
  if (!isPushSupported()) {
    throw new Error("Push notifications aren't supported in this browser.")
  }
  // Web Push requires a secure context. http://<LAN-IP> won't work — only HTTPS
  // (or localhost). This is the most common reason enabling fails.
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    throw new Error("Push needs a secure connection (HTTPS). Open the app over HTTPS or install it, then try again.")
  }

  let permission = Notification.permission
  if (permission === "default" && requestPermission) {
    permission = await Notification.requestPermission()
  }
  // Permission not granted is an expected outcome (handled by the caller), not an error.
  if (permission !== "granted") return false

  // Give the SW a generous window here since this runs from a user gesture and we
  // want it to succeed if the worker is merely still activating.
  const registration = await swReady(8000)
  if (!registration) {
    throw new Error("The app's service worker isn't ready yet. Reload the page and try again.")
  }
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    const publicKey = await PushService.getVapidPublicKey()
    if (!publicKey) {
      throw new Error("Server push keys aren't configured. Contact support.")
    }
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  await saveSubscription(subscription, installationType)
  return true
}

async function saveSubscription(
  subscription: PushSubscription,
  installationType: InstallationType,
): Promise<void> {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh ?? arrayBufferToBase64Url(subscription.getKey("p256dh"))
  const auth = json.keys?.auth ?? arrayBufferToBase64Url(subscription.getKey("auth"))
  await PushService.subscribe({
    endpoint: subscription.endpoint,
    p256dh,
    auth,
    installationType,
  })
}

/** Re-subscribe after the browser rotates/expires the subscription. */
export async function refreshPushSubscription(
  installationType: InstallationType,
): Promise<void> {
  if (!isPushSupported()) return
  if (Notification.permission !== "granted") return
  const registration = await swReady()
  if (!registration) return
  const publicKey = await PushService.getVapidPublicKey()
  if (!publicKey) return
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
  await saveSubscription(subscription, installationType)
}

/** Remove the local subscription and tell the backend to drop it. */
export async function removePushSubscription(): Promise<void> {
  if (!isPushSupported()) return
  try {
    const registration = await swReady()
    if (!registration) return
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await PushService.unsubscribe(subscription.endpoint).catch(() => {})
      await subscription.unsubscribe().catch(() => {})
    }
  } catch {
    /* ignore */
  }
}
