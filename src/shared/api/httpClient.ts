import {
  ApiError,
  apiErrorCodeFor,
  isProblemDetailsBody,
  type ProblemDetailsBody,
} from './ApiError'

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'
const UNREACHABLE_MESSAGE = 'Cannot reach the server. Check your connection and try again.'
const UNREADABLE_MESSAGE = 'The server sent a response that could not be read.'

export type HttpClientOptions = {
  // Staff sign-in will send a bearer token (Authentik, add-identity-access). Cookies are not used,
  // so `credentials` is left at the fetch default and not set here.
  getAccessToken?: () => string | null | Promise<string | null>
}

// A factory rather than a singleton so a second origin is possible later without changing callers.
export function createHttpClient(baseUrl: string, options: HttpClientOptions = {}) {
  async function send<T>(path: string, init: RequestInit): Promise<T> {
    const headers = new Headers(init.headers)
    const token = await options.getAccessToken?.()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    let response: Response
    try {
      response = await fetch(`${baseUrl}${path}`, { ...init, headers })
    } catch {
      // An aborted request (a cancelled query) is not a connection problem and must not be reported as one.
      if (init.signal?.aborted) {
        throw new DOMException('The request was aborted.', 'AbortError')
      }
      throw new ApiError(0, 'UNKNOWN', UNREACHABLE_MESSAGE)
    }

    return parseResponse<T>(response)
  }

  async function get<T>(path: string, init: RequestInit = {}): Promise<T> {
    return send<T>(path, { ...init, method: 'GET' })
  }

  async function post<T, B = undefined>(path: string, body?: B, init: RequestInit = {}): Promise<T> {
    return send<T>(path, withJsonBody('POST', body, init))
  }

  async function patch<T, B = undefined>(path: string, body?: B, init: RequestInit = {}): Promise<T> {
    return send<T>(path, withJsonBody('PATCH', body, init))
  }

  async function del<T>(path: string, init: RequestInit = {}): Promise<T> {
    return send<T>(path, { ...init, method: 'DELETE' })
  }

  return { get, post, patch, delete: del }
}

export type HttpClient = ReturnType<typeof createHttpClient>

// Content-Type is only meaningful with a body, so it is set here and not on GET or DELETE. Caller
// headers are merged last so a caller can override it.
function withJsonBody(method: 'POST' | 'PATCH', body: unknown, init: RequestInit): RequestInit {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  new Headers(init.headers).forEach((value, key) => headers.set(key, value))

  return {
    ...init,
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const problem = await readProblem(response)
    throw new ApiError(
      response.status,
      apiErrorCodeFor(response.status),
      messageFrom(problem),
      problem?.traceId ?? null,
    )
  }

  // 204 and zero-length bodies have nothing to parse. response.json() would throw on them.
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  const text = await response.text()
  if (text === '') {
    return undefined as T
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError(response.status, 'UNKNOWN', UNREADABLE_MESSAGE)
  }
}

async function readProblem(response: Response): Promise<ProblemDetailsBody | null> {
  try {
    const text = await response.text()
    if (text === '') {
      return null
    }

    const parsed: unknown = JSON.parse(text)
    return isProblemDetailsBody(parsed) ? parsed : null
  } catch {
    return null
  }
}

// Shows the server's detail (a sentence written for the user). For validation failures, which have
// no detail, the first field message is used. The API's ProblemDetails bodies never include stack
// traces, so passing the message through is safe.
function messageFrom(problem: ProblemDetailsBody | null): string {
  if (problem?.detail) {
    return problem.detail
  }

  const firstFieldMessage = problem?.errors ? Object.values(problem.errors).flat()[0] : undefined
  return firstFieldMessage ?? problem?.title ?? FALLBACK_MESSAGE
}
