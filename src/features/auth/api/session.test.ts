import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from 'oidc-client-ts'
import { ApiError } from '@/shared/api/ApiError'
import { sessionService } from './session'

const { manager, getIdentity } = vi.hoisted(() => ({
  manager: {
    getUser: vi.fn(),
    signinRedirect: vi.fn(),
    signinRedirectCallback: vi.fn(),
    signinSilent: vi.fn(),
    signoutRedirect: vi.fn(),
    removeUser: vi.fn(),
  },
  getIdentity: vi.fn(),
}))

vi.mock('./userManager', () => ({ userManager: manager }))
vi.mock('@/shared/api/client', () => ({ api: { get: getIdentity } }))

const IDENTITY = { staffId: 'staff-1', username: 'controller.mahesh', role: 'network_controller' }

// Only the fields session.ts reads. The cast stands in for the library class, whose methods and
// private state are irrelevant here.
type StoredUser = {
  access_token: string
  expired: boolean
  profile: { groups?: unknown }
  state?: unknown
}

function storedUser(overrides: Partial<StoredUser> = {}): User {
  return {
    access_token: 'access-1',
    expired: false,
    profile: { groups: ['network_controller'] },
    state: { returnTo: '/' },
    ...overrides,
  } as unknown as User
}

beforeEach(() => {
  vi.resetAllMocks()
  manager.getUser.mockResolvedValue(null)
  manager.removeUser.mockResolvedValue(undefined)
  manager.signoutRedirect.mockResolvedValue(undefined)
  getIdentity.mockResolvedValue(IDENTITY)
})

describe('sessionService.getSession', () => {
  it('is signed out when the store has no user, without calling the API', async () => {
    await expect(sessionService.getSession()).resolves.toEqual({ status: 'signed_out' })
    expect(getIdentity).not.toHaveBeenCalled()
  })

  it('restores a signed-in staff user from the stored token and /me', async () => {
    manager.getUser.mockResolvedValue(storedUser())

    await expect(sessionService.getCurrentUser()).resolves.toEqual({
      id: 'staff-1',
      displayName: 'controller.mahesh',
      role: 'network_controller',
    })
    expect(getIdentity).toHaveBeenCalledWith('/api/v1/identity/me')
  })

  it.each([
    ['a guard', ['guard']],
    ['an empty groups claim', []],
    ['an unknown group', ['passenger']],
    ['both operations roles', ['network_controller', 'auditor']],
  ])('is signed in but has no access for %s', async (_label, groups) => {
    manager.getUser.mockResolvedValue(storedUser({ profile: { groups } }))

    await expect(sessionService.getSession()).resolves.toEqual({ status: 'no_access' })
    expect(getIdentity).not.toHaveBeenCalled()
  })

  it('treats a 401 from /me as signed out and clears the stored token', async () => {
    manager.getUser.mockResolvedValue(storedUser())
    getIdentity.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Unauthorized'))

    await expect(sessionService.getSession()).resolves.toEqual({ status: 'signed_out' })
    expect(manager.removeUser).toHaveBeenCalled()
  })

  it('treats a 403 from /me as signed in without access', async () => {
    manager.getUser.mockResolvedValue(storedUser())
    getIdentity.mockRejectedValue(new ApiError(403, 'FORBIDDEN_ROLE', 'Forbidden'))

    await expect(sessionService.getSession()).resolves.toEqual({ status: 'no_access' })
    expect(manager.removeUser).not.toHaveBeenCalled()
  })

  it('does not hide a server failure as signed out', async () => {
    manager.getUser.mockResolvedValue(storedUser())
    getIdentity.mockRejectedValue(new ApiError(500, 'UNKNOWN', 'Server error'))

    await expect(sessionService.getSession()).rejects.toMatchObject({ status: 500 })
  })

  it('signs an expired session out when the refresh token cannot renew it', async () => {
    manager.getUser.mockResolvedValue(storedUser({ expired: true }))
    manager.signinSilent.mockRejectedValue(new Error('refresh token expired'))

    await expect(sessionService.getSession()).resolves.toEqual({ status: 'signed_out' })
    expect(manager.removeUser).toHaveBeenCalled()
  })
})

describe('sessionService.getAccessToken', () => {
  it('returns the stored token while it is valid', async () => {
    manager.getUser.mockResolvedValue(storedUser({ access_token: 'access-1' }))

    await expect(sessionService.getAccessToken()).resolves.toBe('access-1')
    expect(manager.signinSilent).not.toHaveBeenCalled()
  })

  it('renews an expired token with the refresh token', async () => {
    manager.getUser.mockResolvedValue(storedUser({ expired: true }))
    manager.signinSilent.mockResolvedValue(storedUser({ access_token: 'access-2' }))

    await expect(sessionService.getAccessToken()).resolves.toBe('access-2')
  })

  it('returns null when there is no user or the renewal fails', async () => {
    await expect(sessionService.getAccessToken()).resolves.toBeNull()

    manager.getUser.mockResolvedValue(storedUser({ expired: true }))
    manager.signinSilent.mockRejectedValue(new Error('no refresh token'))

    await expect(sessionService.getAccessToken()).resolves.toBeNull()
  })
})

describe('sessionService sign-in and sign-out', () => {
  it('starts the redirect with the requested internal return path', async () => {
    await sessionService.signIn('/audit?outcome=denied')

    expect(manager.signinRedirect).toHaveBeenCalledWith({
      state: { returnTo: '/audit?outcome=denied' },
    })
  })

  it('replaces an external return path with the role landing page', async () => {
    await sessionService.signIn('https://elsewhere.example/steal')

    expect(manager.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: '/' } })
  })

  it('returns the user and the remembered path when the callback succeeds', async () => {
    manager.signinRedirectCallback.mockResolvedValue(
      storedUser({ profile: { groups: ['auditor'] }, state: { returnTo: '/audit' } }),
    )
    getIdentity.mockResolvedValue({ staffId: 'staff-2', username: 'auditor.wasantha', role: 'auditor' })

    await expect(sessionService.completeSignIn()).resolves.toEqual({
      state: {
        status: 'signed_in',
        user: { id: 'staff-2', displayName: 'auditor.wasantha', role: 'auditor' },
      },
      returnTo: '/audit',
    })
  })

  it('reports a guard as signed in without access after the callback', async () => {
    manager.signinRedirectCallback.mockResolvedValue(storedUser({ profile: { groups: ['guard'] } }))

    await expect(sessionService.completeSignIn()).resolves.toEqual({
      state: { status: 'no_access' },
      returnTo: '/',
    })
  })

  it('falls back to the role landing page when the callback carries no safe path', async () => {
    manager.signinRedirectCallback.mockResolvedValue(storedUser({ state: { returnTo: '//evil.example' } }))

    await expect(sessionService.completeSignIn()).resolves.toMatchObject({ returnTo: '/' })
  })

  it('propagates a failed callback so the page can show an error', async () => {
    manager.signinRedirectCallback.mockRejectedValue(new Error('state not found'))

    await expect(sessionService.completeSignIn()).rejects.toThrow('state not found')
  })

  it('redirects to Authentik on logout', async () => {
    await sessionService.logout()

    expect(manager.signoutRedirect).toHaveBeenCalled()
    expect(manager.removeUser).not.toHaveBeenCalled()
  })

  it('still clears the local session when the logout redirect fails', async () => {
    manager.signoutRedirect.mockRejectedValue(new Error('Authentik down'))

    await expect(sessionService.logout()).resolves.toBeUndefined()
    expect(manager.removeUser).toHaveBeenCalled()
  })

  it('clears the local session without a redirect', async () => {
    await sessionService.clearSession()

    expect(manager.removeUser).toHaveBeenCalled()
  })
})
