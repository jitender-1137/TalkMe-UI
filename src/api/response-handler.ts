import type { AxiosResponse } from "axios"
import type { ApiResponse, PaginatedResponse } from "./types/api.types"

/**
 * Unwraps a standard ApiResponse envelope from an Axios response.
 * Throws if the server signals `success: false`.
 */
export function unwrapResponse<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const { data } = response
  if (!data.success) {
    throw new Error(data.message ?? "An unexpected error occurred")
  }
  return data.data
}

/**
 * Unwraps a paginated response, returning both `items` and pagination metadata.
 */
export function unwrapPaginatedResponse<T>(
  response: AxiosResponse<ApiResponse<any>>,
): PaginatedResponse<T> {
  const { data } = response
  if (!data.success) {
    throw new Error(data.message ?? "An unexpected error occurred")
  }
  
  const payload = data.data
  if (!payload || typeof payload !== "object") {
    return {
      items: [],
      meta: { page: 0, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false }
    }
  }

  // 1. Spring Boot Page (has "content")
  if ("content" in payload && Array.isArray(payload.content)) {
    return {
      items: payload.content,
      meta: {
        page: payload.number ?? 0,
        limit: payload.size ?? 20,
        total: payload.totalElements ?? 0,
        totalPages: payload.totalPages ?? 0,
        hasNextPage: !(payload.last ?? true),
        hasPrevPage: !(payload.first ?? true),
      }
    }
  }

  // 2. Discover/Pagination style (has "items" and "pagination")
  if ("items" in payload && Array.isArray(payload.items) && "pagination" in payload) {
    const pag = (payload as any).pagination || {}
    return {
      items: payload.items,
      meta: {
        page: pag.page ?? 0,
        limit: pag.limit ?? 20,
        total: pag.total ?? payload.items.length,
        totalPages: pag.totalPages ?? 1,
        hasNextPage: pag.hasNext ?? false,
        hasPrevPage: pag.hasPrevious ?? false,
      }
    }
  }

  // 3. Fallback: already matches standard PaginatedResponse
  if ("items" in payload && Array.isArray(payload.items)) {
    const meta = (payload as any).meta || {}
    return {
      items: payload.items,
      meta: {
        page: meta.page ?? 0,
        limit: meta.limit ?? 20,
        total: meta.total ?? payload.items.length,
        totalPages: meta.totalPages ?? 1,
        hasNextPage: meta.hasNextPage ?? false,
        hasPrevPage: meta.hasPrevPage ?? false,
      }
    }
  }

  // Generic fallback if it's just an array or something unrecognized
  const items = Array.isArray(payload) ? payload : []
  return {
    items: items as T[],
    meta: {
      page: 0,
      limit: items.length || 20,
      total: items.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
}

/**
 * Creates a mock ApiResponse envelope — useful for tests and mock service layers.
 */
export function mockResponse<T>(data: T, message = "OK"): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  }
}
