import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJourneys } from './journeys'

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

describe('getJourneys', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the given railway day and maps each journey without a live status', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(dtoFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
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
