export interface AuthUser {
  id: string
  email: string
  name: string | null
  organizationId: string
}

export interface RegisterPayload {
  email: string
  password: string
  name: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface TransactionExtractPayload {
  text: string
}

export interface TransactionResponse {
  id: string
  date: string
  description: string
  amount: number
  type: "debit" | "credit"
  balance?: number
  category?: string
  confidence: number
  createdAt: string
}

export interface TransactionListResponse {
  transactions: TransactionResponse[]
  nextCursor?: string
  hasMore: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}
