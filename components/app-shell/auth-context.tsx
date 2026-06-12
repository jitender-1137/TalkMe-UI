"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import { useLogin, useSignup, useLogout, useGuestLogin, useMe } from "@/src/api/hooks/useLogin"
import { proactiveTokenRefresh, getAccessToken } from "@/src/api/client"

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
  login: (email: string, password: string, rememberMe?: boolean) => void
  signup: (name: string, email: string, password: string, username: string, age: number, gender: string) => Promise<any>
  loginAsGuest: (name: string, age: number, gender: string) => void
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

  const loginMutation = useLogin()
  const signupMutation = useSignup()
  const logoutMutation = useLogout()
  const guestLoginMutation = useGuestLogin()

  // Try to restore session on mount using refresh token
  const { data: meData, isLoading, isError } = useMe()

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
    } else if (isError) {
      setIsAuthenticated(false)
      setUser(null)
    }
  }, [meData, isError])

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
      setIsAuthenticated((prev) => {
        if (prev) {
          setShowLoginModal(true)
        }
        return false
      })
      setIsGuestMatch(false)
      setUser(null)
      setGuestUser(null)
    }

    window.addEventListener("auth:session-expired", handleSessionExpired)
    return () => window.removeEventListener("auth:session-expired", handleSessionExpired)
  }, [])

  const login = useCallback(
    (email: string, password: string, rememberMe?: boolean) => {
      loginMutation.mutate(
        { email, password, rememberMe },
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
    (name: string, email: string, password: string, username: string, age: number, gender: string) => {
      return signupMutation.mutateAsync(
        { name, email, password, username, age, gender },
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
    (name: string, age: number, gender: string) => {
      // Optimistic local update first so UI responds immediately
      setIsGuestMatch(true)
      setGuestUser({ name, age, gender })

      guestLoginMutation.mutate({ name, age, gender })
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
