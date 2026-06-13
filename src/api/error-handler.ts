import axios from "axios";
import { toast } from "sonner";
import type { ApiError } from "./types/api.types";

/** HTTP status codes mapped to user-friendly messages */
const STATUS_MESSAGES: Record<number, string> = {
  400: "Bad request. Please check your input.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "This action conflicts with existing data.",
  422: "Validation failed. Please check your input.",
  429: "Too many requests. Please slow down.",
  500: "Server error. Please try again later.",
  502: "Service temporarily unavailable.",
  503: "Service temporarily unavailable. Please try again later.",
};

/**
 * Transforms any Axios error into a typed ApiError.
 * This is called by the response interceptor in client.ts.
 */
export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const serverMessage: string =
      error.response?.data?.message ??
      error.response?.data?.error ??
      STATUS_MESSAGES[status] ??
      "An unexpected error occurred";

    const apiError: ApiError = {
      message: serverMessage,
      status,
      code: error.response?.data?.code,
      details: error.response?.data?.details,
    };

    // Auto-show toasts for known error categories
    if (status === 401) {
      // Could trigger a token refresh flow or redirect to login
      // toast.error("Session expired", { description: "Please sign in again." })
    } else if (status === 403) {
      toast.error("Access denied", { description: serverMessage });
    } else if (status === 429) {
      toast.warning("Slow down", { description: serverMessage });
    } else if (status >= 500) {
      toast.error("Server error", { description: serverMessage });
    } else if (!navigator?.onLine) {
      toast.error("No internet connection", {
        description: "Check your connection and try again.",
      });
    }

    return apiError;
  }

  if (error instanceof Error) {
    return { message: error.message, status: 0 };
  }

  return { message: "An unknown error occurred", status: 0 };
}

/**
 * Determines whether an error is an ApiError shape.
 */
export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "message" in error && "status" in error;
}

/**
 * Returns a friendly display message from any error value.
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}

/**
 * Show a toast for a successful mutation with an optional description.
 */
export function showSuccessToast(message: string, description?: string): void {
  toast.success(message, description ? { description } : undefined);
}

/**
 * Show a toast for a failed mutation.
 */
export function showErrorToast(error: unknown): void {
  const message = getErrorMessage(error);
  toast.error("Something went wrong", { description: message });
}

/**
 * Show a warning toast.
 */
export function showWarningToast(message: string, description?: string): void {
  toast.warning(message, description ? { description } : undefined);
}

/**
 * Show a network error toast (no internet).
 */
export function showNetworkErrorToast(): void {
  toast.error("No internet connection", {
    description: "Check your connection and try again.",
  });
}
