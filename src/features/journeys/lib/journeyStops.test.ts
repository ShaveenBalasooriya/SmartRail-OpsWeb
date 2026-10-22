import { describe, expect, it } from 'vitest'
import { indexStations } from '@/features/stations/lib/stationLookup'
import type { Station } from '@/features/stations/types'
import type { JourneyStop } from '../types'
import { toStopRows } from './journeyStops'

const stations: Station[] = [
  {
    id: 'st-kandy',
    code: 'KDY',
    name: 'Kandy',
    isInterchange: true,
    platforms: [{ id: 'pl-kandy-2', stationId: 'st-kandy', number: '2' }],
    lines: [],
  },
  {
    id: 'st-galle',
    code: 'GLE',
    name: 'Galle',
    isInterchange: false,
    platforms: [{ id: 'pl-galle-1', stationId: 'st-galle', number: '1' }],
    lines: [],
  },
]

const index = indexStations(stations)

function stop(overrides: Partial<JourneyStop>): JourneyStop {
  return {
    sequence: 1,
    stationId: 'st-galle',
    isCalling: true,
    scheduledArrival: '2026-10-21T02:40:00Z',
    scheduledDeparture: '2026-10-21T02:41:00Z',
    platformId: 'pl-galle-1',
    ...overrides,
  }
}

describe('toStopRows', () => {
  it('orders the rows by sequence, whatever order the stops arrive in', () => {
    const rows = toStopRows(
      [stop({ sequence: 3 }), stop({ sequence: 1 }), stop({ sequence: 2 })],
      index,
    )

    expect(rows.map((row) => row.sequence)).toEqual([1, 2, 3])
  })

  it('does not reorder the stops it was given', () => {
    const stops = [stop({ sequence: 2 }), stop({ sequence: 1 })]

    toStopRows(stops, index)

    expect(stops.map((item) => item.sequence)).toEqual([2, 1])
  })

  it('joins the station name, the interchange flag and the platform number', () => {
    const [row] = toStopRows(
      [stop({ sequence: 1, stationId: 'st-kandy', platformId: 'pl-kandy-2' })],
      index,
    )

    expect(row).toEqual({
      sequence: 1,
      stationName: 'Kandy',
      isInterchange: true,
      isCalling: true,
      arrival: '2026-10-21T02:40:00Z',
      departure: '2026-10-21T02:41:00Z',
      platformNumber: '2',
    })
  })

  it('leaves the station name null and not interchange for an id the reference data does not know', () => {
    const [row] = toStopRows([stop({ stationId: 'st-unknown' })], index)

    expect(row?.stationName).toBeNull()
    expect(row?.isInterchange).toBe(false)
  })

  it('leaves the platform null when the stop has none or its platform is unknown', () => {
    const rows = toStopRows(
      [
        stop({ sequence: 1, platformId: null }),
        stop({ sequence: 2, platformId: 'pl-unknown' }),
      ],
      index,
    )

    expect(rows.map((row) => row.platformNumber)).toEqual([null, null])
  })

  it('keeps a non-calling stop without times or a platform', () => {
    const [row] = toStopRows(
      [stop({ isCalling: false, scheduledArrival: null, scheduledDeparture: null, platformId: null })],
      index,
    )

    expect(row).toMatchObject({
      isCalling: false,
      arrival: null,
      departure: null,
      platformNumber: null,
    })
  })

  it('returns no rows for a journey with no stops', () => {
    expect(toStopRows([], index)).toEqual([])
  })
})
