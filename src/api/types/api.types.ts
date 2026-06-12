// ── Standard envelope ────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp: string
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}

export interface PaginationParams {
  page?: number
  limit?: number
  cursor?: string
}

// ── Errors ────────────────────────────────────────────────────────────────────
export interface ApiError {
  message: string
  status: number
  code?: string
  details?: Record<string, string[]>
}

// ── Sorting / filtering ───────────────────────────────────────────────────────
export type SortOrder = "asc" | "desc"

export interface SortParams {
  sortBy?: string
  sortOrder?: SortOrder
}

export interface SearchParams {
  q?: string
}

// ── Upload ────────────────────────────────────────────────────────────────────
export interface UploadResponse {
  url: string
  key: string
  mimeType: string
  size: number
}
