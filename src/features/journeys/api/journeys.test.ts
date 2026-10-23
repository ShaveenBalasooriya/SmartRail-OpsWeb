import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import { getJourney, getJourneys } from './journeys'

// Shaped like SmartRail-API JourneyDto (Timetable.cs), trimmed to the fields the service reads plus a
// stops array that must be ignored.
const dtoFixture = [
  {
    id: '0196f2a0-0000-7000-8000-000000000001',
    serviceId: '0196f2a0-0000-7000-8000-0000000000aa',
    serviceName: 'Kandy Express',
    lineId: '0196f2a0-0000-7000-8000-0000000000bb',
    lineCode: 'KDY',
    lineName: 'Main Line',
    direction: 'outbound',
    serviceDate: '2026-10-21',
    guardStaffId: '0196f2a0-0000-7000-8000-0000000000cc',
    scheduledDepartureAt: '2026-10-21T02:30:00Z',
    stops: [{ sequence: 1, stationId: 'x', isCalling: true }],
  },
]

// Shaped like JourneyDto with complete stops. Sequence arrives as a string for the first stop to prove
// that the wire's integer-or-string is parsed.
const detailFixture = [
  {
    id: '0196f2a0-0000-7000-8000-000000000001',
    serviceId: '0196f2a0-0000-7000-8000-0000000000aa',
    serviceName: 'Kandy Express',
    lineId: '0196f2a0-0000-7000-8000-0000000000bb',
    lineCode: 'KDY',
    lineName: 'Main Line',
    direction: 'outbound',
    serviceDate: '2026-10-21',
    guardStaffId: '0196f2a0-0000-7000-8000-0000000000cc',
    scheduledDepartureAt: '2026-10-21T02:30:00Z',
    stops: [
      {
        sequence: '2',
        stationId: '0196f2a0-0000-7000-8000-0000000000d2',
        isCalling: true,
        scheduledArrival: '2026-10-21T02:40:00Z',
        scheduledDeparture: '2026-10-21T02:41:00Z',
        platformId: '0196f2a0-0000-7000-8000-0000000000e2',
      },
      {
        sequence: 1,
        stationId: '0196f2a0-0000-7000-8000-0000000000d1',
        isCalling: true,
        scheduledArrival: null,
        scheduledDeparture: '2026-10-21T02:30:00Z',
        platformId: '0196f2a0-0000-7000-8000-0000000000e1',
      },
    ],
  },
]

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getJourneys', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the given railway day and maps each journey without a live status', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(dtoFixture))
    vi.stubGlobal('fetch', fetchMock)

    const journeys = await getJourneys('2026-10-21')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/timetable/journeys?date=2026-10-21')
    expect(journeys).toEqual([
      {
        id: '0196f2a0-0000-7000-8000-000000000001',
        serviceName: 'Kandy Express',
        lineCode: 'KDY',
        lineName: 'Main Line',
        direction: 'outbound',
        scheduledDepartureAt: '2026-10-21T02:30:00Z',
        status: null,
      },
    ])
  })
})

describe('getJourney', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the day list and returns the journey with its stops, sequence parsed to a number', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(detailFixture))
    vi.stubGlobal('fetch', fetchMock)

    const journey = await getJourney('0196f2a0-0000-7000-8000-000000000001', '2026-10-21')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/timetable/journeys?date=2026-10-21')
    expect(journey).toEqual({
      id: '0196f2a0-0000-7000-8000-000000000001',
      serviceName: 'Kandy Express',
      lineCode: 'KDY',
      lineName: 'Main Line',
      direction: 'outbound',
      scheduledDepartureAt: '2026-10-21T02:30:00Z',
      status: null,
      serviceDate: '2026-10-21',
      stops: [
        {
          sequence: 2,
          stationId: '0196f2a0-0000-7000-8000-0000000000d2',
          isCalling: true,
          scheduledArrival: '2026-10-21T02:40:00Z',
          scheduledDeparture: '2026-10-21T02:41:00Z',
          platformId: '0196f2a0-0000-7000-8000-0000000000e2',
        },
        {
          sequence: 1,
          stationId: '0196f2a0-0000-7000-8000-0000000000d1',
          isCalling: true,
          scheduledArrival: null,
          scheduledDeparture: '2026-10-21T02:30:00Z',
          platformId: '0196f2a0-0000-7000-8000-0000000000e1',
        },
      ],
    })
  })

  it('rejects with a 404 ApiError when the id is not on that day', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(detailFixture)))

    const failure = await getJourney('0196f2a0-0000-7000-8000-00000000ffff', '2026-10-21').catch(
      (error: unknown) => error,
    )

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('rejects a stop sequence that is not a whole number instead of ordering it arbitrarily', async () => {
    const malformed = [
      {
        ...detailFixture[0],
        stops: [{ ...detailFixture[0]?.stops[0], sequence: 'first' }],
      },
    ]
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(malformed)))

    await expect(getJourney('0196f2a0-0000-7000-8000-000000000001', '2026-10-21')).rejects.toThrow(
      'not a whole number',
    )
  })
})
