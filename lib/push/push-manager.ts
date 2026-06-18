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

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
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
  if (!isPushSupported()) return false

  let permission = Notification.permission
  if (permission === "default" && requestPermission) {
    permission = await Notification.requestPermission()
  }
  if (permission !== "granted") return false

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    const publicKey = await PushService.getVapidPublicKey()
    if (!publicKey) return false
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
  const registration = await navigator.serviceWorker.ready
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
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await PushService.unsubscribe(subscription.endpoint).catch(() => {})
      await subscription.unsubscribe().catch(() => {})
    }
  } catch {
    /* ignore */
  }
}
