// The SmartRail API answers every failure with RFC 9457 problem details (SmartRail-API
// ResultExtensions.ToProblemDetails). The body has no machine-readable code, so the code is derived
// from the status. That is lossless here: StatusFor maps each error type to exactly one status, so
// the status identifies the type. The UI branches on the code, never on the status number or the
// message text.
export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ROLE'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'UNKNOWN'

export const API_ERROR_CODE_VALUES: ApiErrorCode[] = [
  'UNAUTHENTICATED',
  'FORBIDDEN_ROLE',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CONFLICT',
  'UNKNOWN',
]

// Status 0 means no response arrived at all (network failure); see httpClient.ts.
export class ApiError extends Error {
  status: number
  code: ApiErrorCode
  traceId: string | null

  constructor(status: number, code: ApiErrorCode, message: string, traceId: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.traceId = traceId
  }
}

export type ProblemDetailsBody = {
  title?: string
  detail?: string
  traceId?: string
  errors?: Record<string, string[]>
}

// Untrusted bodies (a proxy error page, a truncated response) must not crash the client, so every
// field is checked before it is trusted. Anything that fails the check is treated as "no body".
export function isProblemDetailsBody(value: unknown): value is ProblemDetailsBody {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const body = value as Record<string, unknown>
  return (
    (body.title === undefined || typeof body.title === 'string') &&
    (body.detail === undefined || typeof body.detail === 'string') &&
    (body.traceId === undefined || typeof body.traceId === 'string') &&
    (body.errors === undefined || isFieldErrors(body.errors))
  )
}

function isFieldErrors(value: unknown): value is Record<string, string[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every(
    (messages) => Array.isArray(messages) && messages.every((message) => typeof message === 'string'),
  )
}

export function apiErrorCodeFor(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR'
    case 401:
      return 'UNAUTHENTICATED'
    case 403:
      return 'FORBIDDEN_ROLE'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    default:
      return 'UNKNOWN'
  }
}

// A role the API does not allow. A screen that can hit this renders the app's forbidden page rather
// than a retryable error, because retrying cannot change the signed-in person's role.
export function isForbiddenRole(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'FORBIDDEN_ROLE'
}
