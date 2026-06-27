"use client"

import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { usePostByCode } from "@/src/api/hooks/useFeed"
import { useProfile } from "@/src/api/hooks/useProfile"
import { QUERY_KEYS } from "@/src/api/query-keys"

const PENDING_KEY = "tm_pending_post_code"

/**
 * Opens a post that was reached via a shareable /post/{shortCode} link.
 *
 * The /post/[code] route stashes the code (sessionStorage + a `post:open-code`
 * event) and redirects into the app. This (always-mounted, in the root layout)
 * resolves the code → post once the user is authenticated, then hands off to the
 * existing global post-detail opener via the `post:open` event. For a logged-out
 * visitor the code survives the login round-trip in sessionStorage, so the post
 * opens right after they sign in.
 */
export function PendingPostOpener() {
  const [code, setCode] = useState<string | null>(null)
  const { data: ownProfile } = useProfile()
  const queryClient = useQueryClient()
  const { data: post, isError } = usePostByCode(code)
  const handledRef = useRef(false)

  // Pick up a pending code on mount + via the route's event (warm navigations).
  useEffect(() => {
    try {
      const c = sessionStorage.getItem(PENDING_KEY)
      if (c) setCode(c)
    } catch {}

    const handler = (e: Event) => {
      const c = (e as CustomEvent).detail?.code
      if (typeof c === "string" && c) {
        try {
          sessionStorage.setItem(PENDING_KEY, c)
        } catch {}
        handledRef.current = false
        setCode(c)
      }
    }
    window.addEventListener("post:open-code", handler)
    return () => window.removeEventListener("post:open-code", handler)
  }, [])

  // Re-check once authenticated (covers the log-in-then-open flow).
  useEffect(() => {
    if (!ownProfile?.id) return
    try {
      const c = sessionStorage.getItem(PENDING_KEY)
      if (c) setCode(c)
    } catch {}
  }, [ownProfile?.id])

  // Resolved → seed the detail cache and hand off to the global opener.
  useEffect(() => {
    if (!code || handledRef.current) return
    if (post) {
      handledRef.current = true
      queryClient.setQueryData(QUERY_KEYS.POSTS.DETAIL(post.id), post)
      window.dispatchEvent(new CustomEvent("post:open", { detail: { postId: post.id } }))
      try {
        sessionStorage.removeItem(PENDING_KEY)
      } catch {}
      setCode(null)
    } else if (isError) {
      handledRef.current = true
      toast("This post is no longer available")
      try {
        sessionStorage.removeItem(PENDING_KEY)
      } catch {}
      setCode(null)
    }
  }, [code, post, isError, queryClient])

  return null
}
