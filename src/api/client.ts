import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from "axios";
import { handleApiError } from "./error-handler";
import {
  getAccessToken,
  setAccessToken,
  clearAllTokens,
  getCsrfToken,
  getIsRefreshing,
  setIsRefreshing,
  subscribeToRefresh,
  notifyRefreshSubscribers,
  isAccessTokenExpired,
  getTokenExpiresAt,
} from "./token-store";
import { ENDPOINTS } from "./endpoints";

export const checkIsSameJar = (): boolean => {
  if (typeof window === "undefined") return true;

  // 1. Next.js dev server on port 3000 is considered "different"
  if (window.location.port === "3000") {
    return false;
  }

  // 2. If hostname is localhost or 127.0.0.1, and port is NOT 3000 (e.g. 8080), it's the Spring Boot jar
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return window.location.port !== "3000";
  }

  // 3. If the current hostname is a known frontend-only hosting provider (e.g. Vercel, Netlify, AWS Amplify)
  if (
    window.location.hostname.endsWith(".vercel.app") ||
    window.location.hostname.endsWith(".amplifyapp.com") ||
    window.location.hostname.endsWith(".netlify.app")
  ) {
    return false;
  }

  // 4. Compare current hostname with the hostname of the baked-in API_URL
  const bakedApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (bakedApiUrl) {
    try {
      const url = new URL(bakedApiUrl);
      // If the current hostname matches the hostname of NEXT_PUBLIC_API_URL, they are same domain (same jar/proxy)
      if (window.location.hostname === url.hostname) {
        return true;
      }
    } catch (e) {
      // Ignore
    }
  }

  // Default fallback: if we are not on port 3000, and not on a known separate frontend hosting,
  // assume we are running on the same domain/JAR.
  return true;
};

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    if (checkIsSameJar()) {
      // Same jar: use relative path
      return process.env.NEXT_PUBLIC_API_PATH || "/api/v1";
    } else {
      // Different: use absolute NEXT_PUBLIC_API_URL from .env
      return process.env.NEXT_PUBLIC_API_URL || "/api/v1";
    }
  }
  // Server-side (SSR): use absolute URL because relative URLs fail on the server
  const envUrl = process.env.API_URL;
  if (envUrl) return envUrl;
  return "http://localhost:8080/api/v1";
};

export const BASE_URL = getBaseUrl();
if (typeof window !== "undefined") {
  console.log(
    "[API] BASE_URL:",
    getBaseUrl(),
    "process.env.NEXT_PUBLIC_API_PATH:",
    process.env.NEXT_PUBLIC_API_PATH,
    "isSameJar:",
    checkIsSameJar()
  );
}

export function getMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  if (path.startsWith("blob:")) return path; // Do not modify local blobs
  if (path.includes("/uploads/media?path=")) return path; // Prevent double-formatting
  return `${getBaseUrl()}/uploads/media?path=${encodeURIComponent(path)}`;
}

export function formatMediaUrls(obj: any) {
  if (!obj || typeof obj !== "object") return;

  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    if (
      typeof value === "string" &&
      !value.includes("/uploads/media?path=") &&
      (value.startsWith("/opt/media/") || value.startsWith("/uploads/"))
    ) {
      obj[key] = getMediaUrl(value);
    } else if (typeof value === "object") {
      formatMediaUrls(value);
    }
  });
}

export function formatPostCompat(obj: any) {
  if (!obj || typeof obj !== "object") return;

  if (obj.id && obj.user && obj.createdAt && ("likesCount" in obj)) {
    // It's a post!
    obj.userId = obj.user.id;
    obj.userName = obj.user.name || obj.user.username;
    obj.userAvatar = obj.user.avatar;
    obj.isLiked = obj.likedByMe;
    obj.isBookmarked = obj.bookmarkedByMe;
  }

  if (obj.id && obj.content && obj.createdAt && ("username" in obj) && ("name" in obj)) {
    // It's a comment!
    obj.userName = obj.name || obj.username;
    obj.userAvatar = null;
  }

  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === "object") {
      formatPostCompat(value);
    }
  });
}

const TIMEOUT = 15_000;

// Methods that modify state and require CSRF protection
const CSRF_METHODS = ["post", "put", "patch", "delete"];

const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  // CRITICAL: Include cookies (refresh token + csrf token) in all requests
  withCredentials: true,
});

// ── Request interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Dynamically set baseURL on every request to prevent static compilation caching
    config.baseURL = getBaseUrl();

    // Attach access token if available
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach CSRF token for state-changing requests
    // Read from cookie on every request to get the latest value
    const method = config.method?.toLowerCase();
    if (method && CSRF_METHODS.includes(method)) {
      const csrf = getCsrfToken();
      if (csrf) {
        config.headers["X-CSRF-Token"] = csrf;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor ─────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Automatically intercept and format any absolute paths from the backend
    if (response.data) {
      formatMediaUrls(response.data);
      formatPostCompat(response.data);
    }
    // Cookies (refresh token + CSRF token) are automatically handled by the browser
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Skip refresh logic for auth endpoints to prevent infinite loops
    const isAuthEndpoint =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/signup") ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/logout");

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (getIsRefreshing()) {
        return new Promise((resolve, reject) => {
          subscribeToRefresh((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiClient(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      setIsRefreshing(true);

      try {
        // Attempt to refresh the token using the HTTP-only refresh cookie
        // The refresh token cookie is automatically sent via withCredentials: true
        // The server will set new refresh token + CSRF token cookies in the response
        const refreshResponse = await axios.post<{
          success: boolean;
          data: {
            accessToken: string;
            expiresIn: number;
          };
        }>(`${getBaseUrl()}${ENDPOINTS.AUTH.REFRESH}`, {}, { withCredentials: true });

        const { accessToken: newToken, expiresIn } = refreshResponse.data.data;

        // Store new access token in memory
        setAccessToken(newToken, expiresIn);
        // CSRF token is automatically updated via Set-Cookie, getCsrfToken() will read from cookie

        // Notify all queued requests
        notifyRefreshSubscribers(newToken);
        setIsRefreshing(false);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        // Re-read CSRF token from cookie for the retry
        const newCsrf = getCsrfToken();
        if (newCsrf && CSRF_METHODS.includes(originalRequest.method?.toLowerCase() ?? "")) {
          originalRequest.headers["X-CSRF-Token"] = newCsrf;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and notify subscribers
        clearAllTokens();
        notifyRefreshSubscribers(null);
        setIsRefreshing(false);

        // Dispatch custom event for auth context to handle logout UI
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:session-expired"));
        }

        const apiError = handleApiError(refreshError);
        return Promise.reject(apiError);
      }
    }

    // Handle 429 Too Many Requests – log and propagate (do NOT auto-retry to avoid storm)
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.["retry-after"];
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : 60;
      console.warn(
        `[API] Rate limited (429). Retry-After: ${waitSec}s.`,
        originalRequest?.url
      );
      // Surface a clean error; callers should back off based on this
      const apiError = handleApiError(error);
      return Promise.reject(apiError);
    }

    // Handle 403 Forbidden - likely CSRF token mismatch
    if (error.response?.status === 403) {
      const errorData = error.response.data as { code?: string; message?: string };
      const isCsrfError =
        errorData?.code === "CSRF_TOKEN_INVALID" ||
        (typeof errorData?.message === "string" &&
          errorData.message.toLowerCase().includes("csrf"));

      if (isCsrfError && !originalRequest._retry) {
        originalRequest._retry = true;
        // Small delay to let the browser process the new CSRF cookie
        await new Promise((r) => setTimeout(r, 100));
        const freshCsrf = getCsrfToken();
        if (freshCsrf) {
          originalRequest.headers["X-CSRF-Token"] = freshCsrf;
          return apiClient(originalRequest);
        }
      }
    }

    const apiError = handleApiError(error);
    return Promise.reject(apiError);
  },
);

// ── Proactive Token Refresh ──────────────────────────────────────────────────
/**
 * Call this periodically (e.g., every minute) to refresh the token before it expires.
 * This prevents requests from failing due to token expiration.
 */
export async function proactiveTokenRefresh(): Promise<boolean> {
  if (!getAccessToken() || getIsRefreshing()) return false;

  const expiresAt = getTokenExpiresAt();
  if (expiresAt) {
    const timeToExpiry = expiresAt - Date.now();
    // Only refresh if token will expire in the next 2 minutes
    if (timeToExpiry > 2 * 60 * 1000) {
      return false;
    }
  } else {
    return false;
  }

  setIsRefreshing(true);

  try {
    const response = await axios.post<{
      success: boolean;
      data: {
        accessToken: string;
        expiresIn: number;
      };
    }>(`${getBaseUrl()}${ENDPOINTS.AUTH.REFRESH}`, {}, { withCredentials: true });

    const { accessToken: newToken, expiresIn } = response.data.data;
    setAccessToken(newToken, expiresIn);
    // CSRF token automatically updated via cookie

    notifyRefreshSubscribers(newToken);
    setIsRefreshing(false);
    return true;
  } catch {
    setIsRefreshing(false);
    return false;
  }
}

export default apiClient;

// Re-export token management functions for services
export { setAccessToken, clearAllTokens, getAccessToken, getCsrfToken } from "./token-store";
