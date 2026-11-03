import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './ApiError'
import { createHttpClient } from './httpClient'

const fetchMock = vi.fn<typeof fetch>()

function problem(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

describe('createHttpClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('parses a JSON success body', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ id: 'a' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(createHttpClient('').get<{ id: string }[]>('/api/v1/x')).resolves.toEqual([{ id: 'a' }])
  })

  it('returns undefined for a 204 response without parsing a body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(createHttpClient('').delete('/api/v1/x')).resolves.toBeUndefined()
  })

  it('returns undefined for an empty 200 body instead of throwing on JSON.parse', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }))

    await expect(createHttpClient('').get('/api/v1/x')).resolves.toBeUndefined()
  })

  it('maps a validation problem to VALIDATION_ERROR with the first field message and the trace ID', async () => {
    fetchMock.mockResolvedValue(
      problem(
        {
          title: 'The request is invalid.',
          status: 400,
          traceId: 'trace-1',
          errors: { date: ['The date must be today or tomorrow.'] },
        },
        400,
      ),
    )

    const error = await createHttpClient('').get('/api/v1/x').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'The date must be today or tomorrow.',
      traceId: 'trace-1',
    })
  })

  it('uses the server detail as the message for a conflict', async () => {
    fetchMock.mockResolvedValue(
      problem({ title: 'The request conflicts with the current state.', detail: 'Already departed.', status: 409 }, 409),
    )

    await expect(createHttpClient('').post('/api/v1/x')).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: 'Already departed.',
    })
  })

  it('falls back to a generic message and a status-derived code when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Not found</html>', { status: 404 }))

    await expect(createHttpClient('').get('/api/v1/x')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Something went wrong. Please try again.',
      traceId: null,
    })
  })

  it('reports a server that cannot be reached as status 0 with a readable message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(createHttpClient('').get('/api/v1/x')).rejects.toMatchObject({
      status: 0,
      code: 'UNKNOWN',
      message: 'Cannot reach the server. Check your connection and try again.',
    })
  })

  it('sends a bearer token only when one is available', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await createHttpClient('', { getAccessToken: () => 'token-1' }).get('/api/v1/x')
    await createHttpClient('', { getAccessToken: () => null }).get('/api/v1/x')

    const withToken = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    const withoutToken = new Headers(fetchMock.mock.calls[1]?.[1]?.headers)
    expect(withToken.get('Authorization')).toBe('Bearer token-1')
    expect(withoutToken.get('Authorization')).toBeNull()
  })

  it('sets the JSON content type only on requests that carry a body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await createHttpClient('').get('/api/v1/x')
    await createHttpClient('').post('/api/v1/x', { reason: 'signal failure' })

    const getHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers)
    const postInit = fetchMock.mock.calls[1]?.[1]
    expect(getHeaders.get('Content-Type')).toBeNull()
    expect(new Headers(postInit?.headers).get('Content-Type')).toBe('application/json')
    expect(postInit?.body).toBe(JSON.stringify({ reason: 'signal failure' }))
  })
})
