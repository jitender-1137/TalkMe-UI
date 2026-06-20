/**
 * Force a file download instead of navigating to / opening it.
 *
 * A plain `<a download>` is ignored by browsers for cross-origin URLs (they just
 * open the file in the tab). Fetching the resource as a Blob and downloading via
 * an object URL forces a real download regardless of origin. If the fetch fails
 * (e.g. CORS on a CDN), we fall back to opening in a new tab so the user can still
 * save it manually.
 */
export async function downloadFile(url: string, fallbackName = "download"): Promise<void> {
  try {
    const res = await fetch(url, { credentials: "include" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = objectUrl
    link.download = deriveFileName(url, fallbackName, blob.type)
    document.body.appendChild(link)
    link.click()
    link.remove()
    // Revoke after a tick so the download has a chance to start.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } catch {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

function deriveFileName(url: string, fallback: string, mime?: string): string {
  try {
    const path = new URL(url, window.location.href).pathname
    const last = path.split("/").pop() || ""
    if (last && /\.[a-z0-9]+$/i.test(last)) return decodeURIComponent(last)
  } catch {
    /* not a parseable URL — fall through */
  }
  const ext = mime?.split("/")[1]?.split("+")[0]
  return ext ? `${fallback}.${ext}` : fallback
}
