import type { User } from 'oidc-client-ts'
import { ApiError } from '@/shared/api/ApiError'
import { api } from '@/shared/api/client'
import { roleFromGroups } from '../lib/roleFromGroups'
import type { User as StaffUser } from '../types'
import { userManager } from './userManager'

// The identity source behind the app. The UI depends only on this interface, so the OIDC details
// stay in this module and the guards, navbar and pages see a session and a staff user.
export type SessionState =
  | { status: 'signed_out' }
  | { status: 'no_access' }
  | { status: 'signed_in'; user: StaffUser }

export type CompletedSignIn = {
  state: SessionState
  // The internal path the user was on when sign-in started.
  returnTo: string
}

export type SessionService = {
  // The full state, so the UI can tell "signed out" from "signed in but this role has no access".
  getSession: () => Promise<SessionState>
  getCurrentUser: () => Promise<StaffUser | null>
  signIn: (returnTo?: string) => Promise<void>
  completeSignIn: () => Promise<CompletedSignIn>
  logout: () => Promise<void>
  clearSession: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

// Wire shape of GET /api/v1/identity/me (add-identity-access). The role is deliberately not used:
// authorization comes from the token's `groups` claim, and the API is the final authority anyway.
type StaffIdentityWire = {
  staffId: string
  username: string
  role: string
}

// The landing page, not the board: RoleHome sends each role to the page it can actually open.
const DEFAULT_RETURN_PATH = '/'

// A return path arrives from the URL or from OIDC state, so it is untrusted. Only an internal path is
// accepted; `//host` is rejected because a browser treats it as another origin.
function safeReturnPath(value: unknown): string {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }

  return DEFAULT_RETURN_PATH
}

function returnPathFromState(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'returnTo' in state) {
    return safeReturnPath((state as { returnTo?: unknown }).returnTo)
  }

  return DEFAULT_RETURN_PATH
}

async function getAccessToken(): Promise<string | null> {
  const user = await userManager.getUser()
  if (user === null) {
    return null
  }

  if (!user.expired) {
    return user.access_token
  }

  // automaticSilentRenew usually beats this path. It is kept for a tab that was asleep through the
  // expiry: with offline_access the library renews from the refresh token instead of an iframe.
  try {
    const renewed = await userManager.signinSilent()
    return renewed !== null && !renewed.expired ? renewed.access_token : null
  } catch {
    return null
  }
}

async function sessionStateFor(user: User): Promise<SessionState> {
  const role = roleFromGroups(user.profile.groups)
  if (role === null) {
    return { status: 'no_access' }
  }

  try {
    const identity = await api.get<StaffIdentityWire>('/api/v1/identity/me')
    return {
      status: 'signed_in',
      user: { id: identity.staffId, displayName: identity.username, role },
    }
  } catch (error) {
    // A rejected token ends the session; a refused role is signed in but has nothing to open.
    if (error instanceof ApiError && error.status === 401) {
      await userManager.removeUser()
      return { status: 'signed_out' }
    }

    if (error instanceof ApiError && error.status === 403) {
      return { status: 'no_access' }
    }

    throw error
  }
}

async function getSession(): Promise<SessionState> {
  const user = await userManager.getUser()
  if (user === null) {
    return { status: 'signed_out' }
  }

  const accessToken = await getAccessToken()
  if (accessToken === null) {
    // An expired session that cannot be renewed is signed out, not a half-valid state.
    await userManager.removeUser()
    return { status: 'signed_out' }
  }

  return sessionStateFor(user)
}

async function getCurrentUser(): Promise<StaffUser | null> {
  const state = await getSession()
  return state.status === 'signed_in' ? state.user : null
}

async function signIn(returnTo = DEFAULT_RETURN_PATH): Promise<void> {
  // The library stores the PKCE verifier and state in sessionStorage; `state` round-trips our path.
  await userManager.signinRedirect({ state: { returnTo: safeReturnPath(returnTo) } })
}

async function completeSignIn(): Promise<CompletedSignIn> {
  const user = await userManager.signinRedirectCallback()
  return {
    state: await sessionStateFor(user),
    returnTo: returnPathFromState(user.state),
  }
}

async function logout(): Promise<void> {
  try {
    await userManager.signoutRedirect()
  } catch {
    // If Authentik cannot be reached the local session still has to end.
    await userManager.removeUser()
  }
}

async function clearSession(): Promise<void> {
  await userManager.removeUser()
}

export const sessionService: SessionService = {
  getSession,
  getCurrentUser,
  signIn,
  completeSignIn,
  logout,
  clearSession,
  getAccessToken,
}
