import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessTokenProvider, setUnauthorizedHandler } from './authBridge'
import { api } from './client'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  setAccessTokenProvider(() => null)
  setUnauthorizedHandler(null)
})

describe('api client session wiring', () => {
  it('sends the registered access token as a bearer header on every call', async () => {
    setAccessTokenProvider(() => 'token-1')
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

    await api.get('/api/v1/identity/me')

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    expect(headers.get('Authorization')).toBe('Bearer token-1')
  })

  it('sends no bearer header when there is no token', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await api.get('/api/v1/identity/me')

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    expect(headers.get('Authorization')).toBeNull()
  })

  it('ends the session on a 401 from an authenticated call', async () => {
    setAccessTokenProvider(() => 'token-1')
    const endSession = vi.fn()
    setUnauthorizedHandler(endSession)
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ title: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    )

    await expect(api.get('/api/v1/operations/journeys')).rejects.toMatchObject({ status: 401 })
    expect(endSession).toHaveBeenCalledTimes(1)
  })

  it('does not end the session on a 401 when no token was sent', async () => {
    const endSession = vi.fn()
    setUnauthorizedHandler(endSession)
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))

    await expect(api.get('/api/v1/operations/journeys')).rejects.toMatchObject({ status: 401 })
    expect(endSession).not.toHaveBeenCalled()
  })

  it('leaves the session alone on a 403, which is a role refusal and not an expired token', async () => {
    setAccessTokenProvider(() => 'token-1')
    const endSession = vi.fn()
    setUnauthorizedHandler(endSession)
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }))

    await expect(api.get('/api/v1/audit/entries')).rejects.toMatchObject({ status: 403 })
    expect(endSession).not.toHaveBeenCalled()
  })
})
