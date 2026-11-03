// The transport knows how to attach a bearer token but must not import the auth feature, and the
// auth feature imports the transport for /me. This in-memory registry breaks that cycle: app startup
// registers the token source, and the auth provider registers the reaction to a rejected token.
export type AccessTokenProvider = () => string | null | Promise<string | null>

let accessTokenProvider: AccessTokenProvider = () => null
let unauthorizedHandler: (() => void) | null = null

export function setAccessTokenProvider(provider: AccessTokenProvider): void {
  accessTokenProvider = provider
}

export function getAccessToken(): Promise<string | null> {
  return Promise.resolve(accessTokenProvider())
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

// A 401 after a token was sent means the session is over. Signing out must never mask the API error,
// so a failure in the handler is swallowed here.
export function notifyUnauthorized(): void {
  try {
    unauthorizedHandler?.()
  } catch {
    // The caller still receives the ApiError; the handler is a best-effort side effect.
  }
}
