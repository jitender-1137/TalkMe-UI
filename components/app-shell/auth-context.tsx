"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useLogin, useSignup, useLogout, useGuestLogin, useMe, mapAuthUserToUser } from "@/src/api/hooks/useLogin"
import { QUERY_KEYS } from "@/src/api/query-keys"
import { proactiveTokenRefresh, getAccessToken } from "@/src/api/client"
import { wipeLocalData } from "@/src/api/db"

// ── Public types (re-exported for existing consumers) ────────────────────────
export interface User {
  id?: string
  name: string
  email?: string
  avatar?: string
  age?: number
  gender?: string
}

export interface GuestUser {
  name: string
  age: number
  gender: string
}

interface AuthContextType {
  isAuthenticated: boolean
  isGuestMatch: boolean
  isGuest: boolean
  isLoading: boolean
  user: User | null
  guestUser: GuestUser | null
  showLoginModal: boolean
  showSignupModal: boolean
  isLoginPending: boolean
  isSignupPending: boolean
  loginError: string | null
  login: (email: string, password: string, rememberMe?: boolean, captchaToken?: string, website?: string) => void
  signup: (name: string, email: string, password: string, username: string, age: number, gender: string, captchaToken?: string, website?: string) => Promise<any>
  loginAsGuest: (name: string, age: number, gender: string, captchaToken?: string, website?: string) => void
  logout: () => void
  openLoginModal: () => void
  closeLoginModal: () => void
  openSignupModal: () => void
  closeSignupModal: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Token refresh interval (every 4 minutes for 15-minute tokens)
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isGuestMatch, setIsGuestMatch] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)

  const queryClient = useQueryClient()
  const loginMutation = useLogin()
  const signupMutation = useSignup()
  const logoutMutation = useLogout()
  const guestLoginMutation = useGuestLogin()

  // Try to restore session on mount using refresh token
  const { data: meData, isLoading: isMeLoading, isError } = useMe()

  // One-shot bootstrap flag. The initial "Restoring session…" screen should only
  // show during the FIRST session check. Once that resolves (success OR error,
  // e.g. a 401 from /auth/refresh), we are bootstrapped for good — later
  // background refetches (or a queryClient.clear() on logout) must NOT bring the
  // full-screen loader back, otherwise a refresh-401 leaves the UI stuck on
  // "Restoring session…".
  const [bootstrapped, setBootstrapped] = useState(false)
  useEffect(() => {
    if (!isMeLoading) setBootstrapped(true)
  }, [isMeLoading])
  const isLoading = !bootstrapped

  // Sync auth state when me query resolves
  useEffect(() => {
    if (meData) {
      setIsAuthenticated(true)
      setIsGuestMatch(meData.isGuest)
      setUser({
        id: meData.id,
        name: meData.name,
        email: meData.email,
        avatar: meData.avatar ?? undefined,
      })
      // Guests have no separate /users/me profile to fetch — their full profile
      // arrives with /auth/me. Seed the profile cache so useProfile() (gated off for
      // guests) serves from here instead of making a redundant second "me" request.
      if (meData.isGuest) {
        queryClient.setQueryData(QUERY_KEYS.PROFILE.SELF, mapAuthUserToUser(meData))
      }
    } else if (isError) {
      setIsAuthenticated(false)
      setUser(null)
    }
  }, [meData, isError, queryClient])

  // Proactive token refresh — skip for guest users (ephemeral sessions)
  useEffect(() => {
    if (!isAuthenticated || isGuestMatch) return

    const interval = setInterval(() => {
      proactiveTokenRefresh()
    }, TOKEN_REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [isAuthenticated, isGuestMatch])

  // Listen for session expiration events from API client
  useEffect(() => {
    const handleSessionExpired = () => {
      // Superseded by a login on another device (single-device policy) or the
      // session ended.
      setIsAuthenticated((prev) => {
        // Only react if we actually HAD a session. On a fresh load with no
        // valid session, /auth/me → 401 → /auth/refresh → 401 fires this event
        // too; clearing the cache there would re-trigger the useMe query and
        // loop forever (the "stuck on Restoring session…" bug). So we only wipe
        // cached data and prompt re-login when transitioning from authenticated.
        if (prev) {
          setShowLoginModal(true)
          queryClient.clear()
          // Session died WITHOUT a clean logout (token expired / invalidated /
          // superseded). Wipe the local IndexedDB now — otherwise the previous
          // user's chats and messages sit readable on disk (e.g. via DevTools)
          // until someone logs in. Fire-and-forget; rendering is already gated.
          void wipeLocalData()
        }
        return false
      })
      setIsGuestMatch(false)
      setUser(null)
      setGuestUser(null)
    }

    window.addEventListener("auth:session-expired", handleSessionExpired)
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired)
  }, [queryClient])

  const login = useCallback(
    (email: string, password: string, rememberMe?: boolean, captchaToken?: string, website?: string) => {
      loginMutation.mutate(
        { email, password, rememberMe, captchaToken, website },
        {
          onSuccess: (data) => {
            setIsAuthenticated(true)
            setIsGuestMatch(false)
            setUser({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              avatar: data.user.avatar ?? undefined,
            })
            setGuestUser(null)
            setShowLoginModal(false)
          },
        },
      )
    },
    [loginMutation],
  )

  const signup = useCallback(
    (name: string, email: string, password: string, username: string, age: number, gender: string, captchaToken?: string, website?: string) => {
      return signupMutation.mutateAsync(
        { name, email, password, username, age, gender, captchaToken, website },
        {
          onSuccess: (data) => {
            setIsAuthenticated(true)
            setIsGuestMatch(false)
            setUser({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              avatar: data.user.avatar ?? undefined,
            })
            setGuestUser(null)
            setShowSignupModal(false)
          },
        },
      )
    },
    [signupMutation],
  )

  const loginAsGuest = useCallback(
    (name: string, age: number, gender: string, captchaToken?: string, website?: string) => {
      // Only enter the guest (connect/match) session once the server confirms the
      // guest login. Setting this optimistically meant a failed login still
      // switched to the connect tab — so gate it on success and roll back on error.
      guestLoginMutation.mutate(
        { name, age, gender, captchaToken, website },
        {
          onSuccess: () => {
            setIsGuestMatch(true)
            setGuestUser({ name, age, gender })
          },
          onError: () => {
            setIsGuestMatch(false)
            setGuestUser(null)
          },
        },
      )
    },
    [guestLoginMutation],
  )

  const logout = useCallback(() => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        setIsAuthenticated(false)
        setIsGuestMatch(false)
        setUser(null)
        setGuestUser(null)
        // Clear the homepage "entered app" flag so "/" shows the public landing
        // page again on next visit (see components/home/home-gate.tsx).
        try {
          localStorage.removeItem("tm_entered")
        } catch {}
      },
    })
  }, [logoutMutation])

  const openLoginModal = useCallback(() => {
    setShowSignupModal(false)
    setShowLoginModal(true)
  }, [])

  const closeLoginModal = useCallback(() => {
    setShowLoginModal(false)
  }, [])

  const openSignupModal = useCallback(() => {
    setShowLoginModal(false)
    setShowSignupModal(true)
  }, [])

  const closeSignupModal = useCallback(() => {
    setShowSignupModal(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isGuestMatch,
        isGuest: isGuestMatch,
        isLoading,
        user,
        guestUser,
        showLoginModal,
        showSignupModal,
        isLoginPending: loginMutation.isPending,
        isSignupPending: signupMutation.isPending,
        loginError: loginMutation.error
          ? ((loginMutation.error as any)?.response?.data?.message ||
             (loginMutation.error as any)?.message ||
             "Invalid email or password")
          : null,
        login,
        signup,
        loginAsGuest,
        logout,
        openLoginModal,
        closeLoginModal,
        openSignupModal,
        closeSignupModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
