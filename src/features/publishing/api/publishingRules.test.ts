import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import { getPublishingRules } from './publishingRules'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(body, status))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('getPublishingRules', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the delay limits from the operations endpoint', async () => {
    const fetchMock = stubFetch({ delay: { minMinutes: 1, maxMinutes: 720 } })

    const rules = await getPublishingRules()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/operations/publishing-rules')
    expect(rules).toEqual({ delay: { minMinutes: 1, maxMinutes: 720 } })
  })

  it.each([
    ['no body', null],
    ['no delay object', {}],
    ['missing a bound', { delay: { minMinutes: 1 } }],
    ['a string bound', { delay: { minMinutes: '1', maxMinutes: 720 } }],
    ['a fractional bound', { delay: { minMinutes: 1.5, maxMinutes: 720 } }],
    ['a zero minimum', { delay: { minMinutes: 0, maxMinutes: 720 } }],
    ['an inverted range', { delay: { minMinutes: 60, maxMinutes: 60 } }],
  ])('rejects %s instead of inventing limits', async (_label, body) => {
    stubFetch(body)

    await expect(getPublishingRules()).rejects.toBeInstanceOf(ApiError)
  })

  it('still surfaces an API failure as its own error', async () => {
    stubFetch({ detail: 'Sign in to continue.' }, 401)

    await expect(getPublishingRules()).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
  })
})
