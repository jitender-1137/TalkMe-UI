import apiClient, { setAccessToken, clearAllTokens } from "../client"
import { ENDPOINTS } from "../endpoints"
import { unwrapResponse } from "../response-handler"
import type {
  LoginCredentials,
  SignupCredentials,
  LoginResponse,
  SignupResponse,
  AuthUser,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
  GuestLoginPayload,
  GuestLoginResponse,
  RefreshTokenResponse,
  Session,
  SessionsResponse,
} from "../types"

export const AuthService = {
  /**
   * Sign in with email + password.
   * - Access token comes in response body (stored in memory)
   * - Refresh token is set via HttpOnly cookie by the server
   * - CSRF token is set via non-HttpOnly cookie by the server
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: LoginResponse
      timestamp: string
    }>(ENDPOINTS.AUTH.LOGIN, credentials)

    const data = unwrapResponse(response)
    setAccessToken(data.tokens.accessToken, data.tokens.expiresIn)
    // CSRF token is automatically set via cookie - getCsrfToken() reads from document.cookie
    return data
  },

  /**
   * Create a new account.
   * - Access token comes in response body (stored in memory)
   * - Refresh token is set via HttpOnly cookie by the server
   * - CSRF token is set via non-HttpOnly cookie by the server
   */
  signup: async (credentials: SignupCredentials): Promise<SignupResponse> => {
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: SignupResponse
      timestamp: string
    }>(ENDPOINTS.AUTH.SIGNUP, credentials, { skipAuth: true } as any)

    const data = unwrapResponse(response)
    setAccessToken(data.tokens.accessToken, data.tokens.expiresIn)
    // CSRF token is automatically set via cookie
    return data
  },

  /**
   * Join as a guest (no account required).
   * Guest sessions have limited features and shorter token lifetimes (7 days).
   */
  loginAsGuest: async (payload: GuestLoginPayload): Promise<GuestLoginResponse> => {
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: GuestLoginResponse
      timestamp: string
    }>(ENDPOINTS.AUTH.LOGIN, { ...payload, isGuest: true })

    const data = unwrapResponse(response)
    setAccessToken(data.tokens.accessToken, data.tokens.expiresIn)
    // CSRF token is automatically set via cookie
    return data
  },

  /**
   * Sign out — clears all tokens.
   * Server invalidates the refresh token and clears cookies.
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT)
    } finally {
      clearAllTokens()
    }
  },

  /**
   * Refresh the access token using the HTTP-only refresh token cookie.
   * Called automatically by the API client interceptor on 401 responses.
   * Can also be called proactively before token expiration.
   *
   * Response sets:
   * - New access token in body
   * - New refresh token via Set-Cookie (rotation)
   * - New CSRF token via Set-Cookie
   */
  refreshToken: async (): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<{
      success: boolean
      message: string
      data: RefreshTokenResponse
      timestamp: string
    }>(ENDPOINTS.AUTH.REFRESH)

    const data = unwrapResponse(response)
    setAccessToken(data.accessToken, data.expiresIn)
    // CSRF token is automatically set via cookie
    return data
  },

  /** Fetch the currently authenticated user. */
  getMe: async (): Promise<AuthUser> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: AuthUser
      timestamp: string
    }>(ENDPOINTS.AUTH.ME)
    return unwrapResponse(response)
  },

  /** Send a password-reset email. */
  forgotPassword: async (payload: ForgotPasswordPayload): Promise<void> => {
    await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, payload)
  },

  /** Set a new password using the reset token. */
  resetPassword: async (payload: ResetPasswordPayload): Promise<void> => {
    await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, payload)
  },

  /** Change the authenticated user's password (requires the current password). */
  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, payload)
  },

  /** Get all active sessions for the current user. */
  getSessions: async (): Promise<Session[]> => {
    const response = await apiClient.get<{
      success: boolean
      message: string
      data: SessionsResponse
      timestamp: string
    }>(ENDPOINTS.AUTH.SESSIONS)
    return unwrapResponse(response).sessions
  },

  /** Revoke a specific session by ID. */
  revokeSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(ENDPOINTS.AUTH.REVOKE_SESSION(sessionId))
  },

  /** Revoke all sessions except the current one. */
  revokeAllSessions: async (): Promise<void> => {
    await apiClient.post(ENDPOINTS.AUTH.REVOKE_ALL_SESSIONS)
  },
}
