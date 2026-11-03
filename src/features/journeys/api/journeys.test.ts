import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import { getJourney, getJourneys } from './journeys'

// Shaped like ControllerJourneyResponse in /openapi/v1.json (checked 2026-10-28). delayMinutes arrives as a
// string here to prove that the integer-or-string wire type is parsed in one place.
const listFixture = [
  {
    id: '0196f2a0-0000-7000-8000-000000000001',
    serviceName: 'Kandy Express',
    lineCode: 'KDY',
    lineName: 'Main Line',
    direction: 'outbound',
    status: 'running',
    delayMinutes: '7',
    lastDepartedStation: { id: '0196f2a0-0000-7000-8000-0000000000d1', name: 'Kandy' },
    nextStation: { id: '0196f2a0-0000-7000-8000-0000000000d2', name: 'Galle' },
    guardName: 'Nimal Perera',
    lastUpdatedAt: '2026-10-28T02:35:00Z',
    isStale: false,
  },
]

// Shaped like ControllerJourneyDetailResponse. The first stop's sequence arrives as a string, as the API
// types an integer-or-string, and its platform is named in the same response.
const detailFixture = {
  journey: listFixture[0],
  stops: [
    {
      sequence: '2',
      station: { id: '0196f2a0-0000-7000-8000-0000000000d2', name: 'Galle' },
      isCalling: true,
      scheduledArrival: '2026-10-28T02:40:00Z',
      scheduledDeparture: '2026-10-28T02:41:00Z',
      expectedArrival: '2026-10-28T02:47:00Z',
      expectedDeparture: '2026-10-28T02:48:00Z',
      actualDeparture: null,
      platform: { id: '0196f2a0-0000-7000-8000-0000000000e2', number: '3' },
    },
    {
      sequence: 1,
      station: null,
      isCalling: false,
      scheduledArrival: null,
      scheduledDeparture: '2026-10-28T02:30:00Z',
      expectedArrival: null,
      expectedDeparture: '2026-10-28T02:30:00Z',
      actualDeparture: '2026-10-28T02:31:00Z',
      platform: null,
    },
  ],
  changes: [
    {
      id: '0196f2a0-0000-7000-8000-0000000000c1',
      type: 'delay',
      values: { fromStopSequence: '2', minutes: '7' },
      publisherName: 'Nimalka Silva',
      publishedAt: '2026-10-28T02:34:00Z',
      provenance: 'automatically_published',
      corrected: false,
    },
    {
      id: '0196f2a0-0000-7000-8000-0000000000c2',
      type: 'correction',
      values: { correctsChangeId: '0196f2a0-0000-7000-8000-0000000000c1' },
      publisherName: null,
      publishedAt: '2026-10-28T02:36:00Z',
      provenance: 'automatically_published',
      corrected: false,
    },
  ],
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': status === 200 ? 'application/json' : 'application/problem+json' },
  })
}

describe('getJourneys', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads today\'s operations list with no date parameter and maps the live state', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(listFixture))
    vi.stubGlobal('fetch', fetchMock)

    const journeys = await getJourneys()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/operations/journeys')
    expect(journeys).toEqual([
      {
        id: '0196f2a0-0000-7000-8000-000000000001',
        serviceName: 'Kandy Express',
        lineCode: 'KDY',
        lineName: 'Main Line',
        direction: 'outbound',
        status: 'running',
        delayMinutes: 7,
        lastDepartedStation: { id: '0196f2a0-0000-7000-8000-0000000000d1', name: 'Kandy' },
        nextStation: { id: '0196f2a0-0000-7000-8000-0000000000d2', name: 'Galle' },
        guardName: 'Nimal Perera',
        lastUpdatedAt: '2026-10-28T02:35:00Z',
        isStale: false,
      },
    ])
  })

  it('keeps null live values null and carries the API\'s stale flag through', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse([
          {
            ...listFixture[0],
            serviceName: null,
            lineCode: null,
            lineName: null,
            direction: null,
            delayMinutes: null,
            lastDepartedStation: null,
            nextStation: null,
            guardName: null,
            isStale: true,
          },
        ]),
      ),
    )

    const [journey] = await getJourneys()

    expect(journey).toMatchObject({
      serviceName: null,
      direction: null,
      delayMinutes: null,
      lastDepartedStation: null,
      nextStation: null,
      guardName: null,
      isStale: true,
    })
  })
})

describe('getJourney', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the journey, its stops and its changes from the detail endpoint in one request', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(detailFixture))
    vi.stubGlobal('fetch', fetchMock)

    const journey = await getJourney('0196f2a0-0000-7000-8000-000000000001')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/operations/journeys/0196f2a0-0000-7000-8000-000000000001',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(journey.stops).toEqual([
      {
        sequence: 2,
        stationId: '0196f2a0-0000-7000-8000-0000000000d2',
        stationName: 'Galle',
        isCalling: true,
        scheduledArrival: '2026-10-28T02:40:00Z',
        scheduledDeparture: '2026-10-28T02:41:00Z',
        expectedArrival: '2026-10-28T02:47:00Z',
        expectedDeparture: '2026-10-28T02:48:00Z',
        actualDeparture: null,
        platformId: '0196f2a0-0000-7000-8000-0000000000e2',
        platformNumber: '3',
      },
      {
        sequence: 1,
        stationId: null,
        stationName: null,
        isCalling: false,
        scheduledArrival: null,
        scheduledDeparture: '2026-10-28T02:30:00Z',
        expectedArrival: null,
        expectedDeparture: '2026-10-28T02:30:00Z',
        actualDeparture: '2026-10-28T02:31:00Z',
        platformId: null,
        platformNumber: null,
      },
    ])
    expect(journey.changes).toEqual([
      {
        id: '0196f2a0-0000-7000-8000-0000000000c1',
        type: 'delay',
        values: { fromStopSequence: '2', minutes: '7' },
        publisherName: 'Nimalka Silva',
        publishedAt: '2026-10-28T02:34:00Z',
        provenance: 'automatically_published',
        corrected: false,
      },
      {
        id: '0196f2a0-0000-7000-8000-0000000000c2',
        type: 'correction',
        values: { correctsChangeId: '0196f2a0-0000-7000-8000-0000000000c1' },
        publisherName: null,
        publishedAt: '2026-10-28T02:36:00Z',
        provenance: 'automatically_published',
        corrected: false,
      },
    ])
  })

  it('rejects with the API\'s 404 as an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({ title: 'Not Found', detail: 'No journey with that id.' }, 404),
      ),
    )

    const failure = await getJourney('0196f2a0-0000-7000-8000-00000000ffff').catch(
      (error: unknown) => error,
    )

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('rejects a stop sequence that is not a whole number instead of ordering it arbitrarily', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({
          ...detailFixture,
          stops: [{ ...detailFixture.stops[0], sequence: 'first' }],
        }),
      ),
    )

    await expect(getJourney('0196f2a0-0000-7000-8000-000000000001')).rejects.toThrow(
      'not a whole number',
    )
  })
})
