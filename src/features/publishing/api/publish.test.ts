import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import {
  publishCancellation,
  publishCorrection,
  publishDelay,
  publishPlatformChange,
  publishTermination,
} from './publish'

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'
const CHANGE_ID = '0196f2a0-0000-7000-8000-0000000000c1'
const PLATFORM_ID = '0196f2a0-0000-7000-8000-0000000000b2'

// The body the API returns for every write: ControllerChangeResponse in /openapi/v1.json (checked
// 2026-10-28). Every value is a string on the wire.
const createdChange = {
  id: CHANGE_ID,
  type: 'delay',
  values: { fromStopSequence: '2', minutes: '10' },
  publisherName: 'Dev Network Controller',
  publishedAt: '2026-10-28T02:40:00Z',
  provenance: 'automatically_published',
  corrected: false,
}

function createdResponse(body: unknown = createdChange): Response {
  return new Response(JSON.stringify(body), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
}

// The failure shape every operations endpoint uses: RFC 9457 problem details with a detail sentence
// written for the controller.
function problemResponse(status: number, detail: string): Response {
  return new Response(
    JSON.stringify({ type: 'https://tools.ietf.org/html/rfc9110', title: 'Request failed', status, detail }),
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

function stubFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestOf(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls[0] ?? []
  return { url, init }
}

describe('publish service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts a delay with the API body and maps the 201 change', async () => {
    const fetchMock = stubFetch(createdResponse())

    const change = await publishDelay(JOURNEY_ID, { fromSequence: 2, minutes: 10 })

    const { url, init } = requestOf(fetchMock)
    expect(url).toBe(`/api/v1/operations/journeys/${JOURNEY_ID}/delays`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ fromStopSequence: 2, minutes: 10 })
    expect(change).toEqual(createdChange)
  })

  it('posts a cancellation with no body, as the endpoint declares none', async () => {
    const fetchMock = stubFetch(createdResponse({ ...createdChange, type: 'cancellation', values: {} }))

    const change = await publishCancellation(JOURNEY_ID)

    const { url, init } = requestOf(fetchMock)
    expect(url).toBe(`/api/v1/operations/journeys/${JOURNEY_ID}/cancellation`)
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeUndefined()
    expect(change.type).toBe('cancellation')
  })

  it('posts a platform change with the API body', async () => {
    const fetchMock = stubFetch(
      createdResponse({ ...createdChange, type: 'platform_change', values: { stopSequence: '2', platformId: PLATFORM_ID } }),
    )

    await publishPlatformChange(JOURNEY_ID, { sequence: 2, platformId: PLATFORM_ID })

    const { url, init } = requestOf(fetchMock)
    expect(url).toBe(`/api/v1/operations/journeys/${JOURNEY_ID}/platform-changes`)
    expect(JSON.parse(String(init?.body))).toEqual({ stopSequence: 2, platformId: PLATFORM_ID })
  })

  it('posts a termination with the last stop served', async () => {
    const fetchMock = stubFetch(
      createdResponse({ ...createdChange, type: 'termination', values: { lastStopSequence: '3' } }),
    )

    await publishTermination(JOURNEY_ID, { lastStopSequence: 3 })

    const { url, init } = requestOf(fetchMock)
    expect(url).toBe(`/api/v1/operations/journeys/${JOURNEY_ID}/termination`)
    expect(JSON.parse(String(init?.body))).toEqual({ lastStopSequence: 3 })
  })

  it('posts a correction to the change endpoint with no body', async () => {
    const fetchMock = stubFetch(
      createdResponse({
        ...createdChange,
        type: 'correction',
        values: { correctsChangeId: CHANGE_ID },
      }),
    )

    const change = await publishCorrection(CHANGE_ID)

    const { url, init } = requestOf(fetchMock)
    expect(url).toBe(`/api/v1/operations/changes/${CHANGE_ID}/corrections`)
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeUndefined()
    expect(change.values.correctsChangeId).toBe(CHANGE_ID)
  })

  describe('problem details', () => {
    it('surfaces the API detail and status for an out-of-range delay (400)', async () => {
      stubFetch(problemResponse(400, 'A delay must be between 1 and 720 minutes.'))

      const error = await publishDelay(JOURNEY_ID, { fromSequence: 2, minutes: 900 }).catch(
        (caught: unknown) => caught,
      )

      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'A delay must be between 1 and 720 minutes.',
      })
    })

    it('surfaces the API detail for an unknown journey (404)', async () => {
      stubFetch(problemResponse(404, 'No journey was found for the given id.'))

      const error = await publishCancellation(JOURNEY_ID).catch((caught: unknown) => caught)

      expect(error).toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'No journey was found for the given id.',
      })
    })

    it('surfaces the API detail for a cancellation after departure (409)', async () => {
      stubFetch(
        problemResponse(409, 'This journey has already departed. End it as an early termination instead.'),
      )

      const error = await publishCancellation(JOURNEY_ID).catch((caught: unknown) => caught)

      expect(error).toMatchObject({
        status: 409,
        code: 'CONFLICT',
        message: 'This journey has already departed. End it as an early termination instead.',
      })
    })

    it('surfaces the API detail for a platform that is not at the stop station (400)', async () => {
      stubFetch(problemResponse(400, 'That platform is not at the stop station.'))

      const error = await publishPlatformChange(JOURNEY_ID, { sequence: 2, platformId: PLATFORM_ID }).catch(
        (caught: unknown) => caught,
      )

      expect(error).toMatchObject({ status: 400, message: 'That platform is not at the stop station.' })
    })

    it('surfaces the API detail for terminating a journey that has not started (409)', async () => {
      stubFetch(problemResponse(409, 'This journey has not started. Cancel it instead.'))

      const error = await publishTermination(JOURNEY_ID, { lastStopSequence: 2 }).catch(
        (caught: unknown) => caught,
      )

      expect(error).toMatchObject({ status: 409, message: 'This journey has not started. Cancel it instead.' })
    })

    it('surfaces the API detail for an unknown change (404)', async () => {
      stubFetch(problemResponse(404, 'No change was found for the given id.'))

      const error = await publishCorrection(CHANGE_ID).catch((caught: unknown) => caught)

      expect(error).toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'No change was found for the given id.',
      })
    })

    it('surfaces the API detail for a change that is already corrected (409)', async () => {
      stubFetch(problemResponse(409, 'That change has already been corrected.'))

      const error = await publishCorrection(CHANGE_ID).catch((caught: unknown) => caught)

      expect(error).toMatchObject({
        status: 409,
        code: 'CONFLICT',
        message: 'That change has already been corrected.',
      })
    })
  })
})
