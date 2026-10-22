import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setMockLatency } from './publish.mock'
import { publishCancellation, publishDelay, publishPlatformChange } from './publish'

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'

// The request bodies are assumed from the spec (see publish.ts). These tests pin what the client sends, so a
// change to the assumed names is visible here first.
function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('publish service', () => {
  beforeEach(() => {
    setMockLatency(0)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  describe('while the operations group is mocked', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_USE_REAL_OPERATIONS', undefined)
    })

    it('answers from the mock and never calls the API', async () => {
      const fetchMock = vi.fn<typeof fetch>()
      vi.stubGlobal('fetch', fetchMock)

      const change = await publishDelay(JOURNEY_ID, { fromSequence: 2, minutes: 10 })

      expect(fetchMock).not.toHaveBeenCalled()
      expect(change).toMatchObject({ type: 'delay', values: { fromSequence: 2, minutes: 10 } })
    })
  })

  describe('while the operations group is real', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_USE_REAL_OPERATIONS', 'true')
    })

    it('posts a delay to the delays endpoint with the assumed body', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ id: 'c1' }))
      vi.stubGlobal('fetch', fetchMock)

      await publishDelay(JOURNEY_ID, { fromSequence: 2, minutes: 10 })

      const [url, init] = fetchMock.mock.calls[0] ?? []
      expect(url).toBe(`/api/v1/operations/journeys/${JOURNEY_ID}/delays`)
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual({ fromSequence: 2, minutes: 10 })
    })

    it('posts a cancellation with no body', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ id: 'c2' }))
      vi.stubGlobal('fetch', fetchMock)

      await publishCancellation(JOURNEY_ID)

      const [url, init] = fetchMock.mock.calls[0] ?? []
      expect(url).toBe(`/api/v1/operations/journeys/${JOURNEY_ID}/cancellation`)
      expect(init?.method).toBe('POST')
      expect(init?.body).toBeUndefined()
    })

    it('posts a platform change to the platform-changes endpoint with the assumed body', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ id: 'c3' }))
      vi.stubGlobal('fetch', fetchMock)

      await publishPlatformChange(JOURNEY_ID, { sequence: 2, platformId: 'pl-3' })

      const [url, init] = fetchMock.mock.calls[0] ?? []
      expect(url).toBe(`/api/v1/operations/journeys/${JOURNEY_ID}/platform-changes`)
      expect(JSON.parse(String(init?.body))).toEqual({ sequence: 2, platformId: 'pl-3' })
    })
  })
})
