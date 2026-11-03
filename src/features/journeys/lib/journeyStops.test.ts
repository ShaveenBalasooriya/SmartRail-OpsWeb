import { describe, expect, it } from 'vitest'
import type { PublishedChange } from '@/features/publishing/types'
import type { JourneyStop } from '../types'
import {
  firstScheduledDeparture,
  toJourneyProgress,
  toPlatformNumbers,
  toStopRows,
} from './journeyStops'

// The API's own stop shape: names, numbers, expected and actual times all come in the response.
function stop(overrides: Partial<JourneyStop>): JourneyStop {
  return {
    sequence: 1,
    stationId: 'st-galle',
    stationName: 'Galle',
    isCalling: true,
    scheduledArrival: '2026-10-28T02:40:00Z',
    scheduledDeparture: '2026-10-28T02:41:00Z',
    expectedArrival: null,
    expectedDeparture: null,
    actualDeparture: null,
    platformId: 'pl-galle-1',
    platformNumber: '1',
    ...overrides,
  }
}

function change(
  overrides: Partial<PublishedChange> & Pick<PublishedChange, 'id' | 'type'>,
): PublishedChange {
  return {
    values: {},
    publisherName: 'Nimalka Silva',
    publishedAt: '2026-10-28T02:40:00Z',
    provenance: 'automatically_published',
    corrected: false,
    ...overrides,
  }
}

describe('toStopRows', () => {
  it('orders the rows by sequence, whatever order the stops arrive in', () => {
    const rows = toStopRows(
      [stop({ sequence: 3 }), stop({ sequence: 1 }), stop({ sequence: 2 })],
      [],
      'running',
    )

    expect(rows.map((row) => row.sequence)).toEqual([1, 2, 3])
  })

  it('does not reorder the stops it was given', () => {
    const stops = [stop({ sequence: 2 }), stop({ sequence: 1 })]

    toStopRows(stops, [], 'running')

    expect(stops.map((item) => item.sequence)).toEqual([2, 1])
  })

  it('carries the station, the scheduled departure and the expected departure', () => {
    const [row] = toStopRows(
      [
        stop({
          sequence: 1,
          stationName: 'Kandy',
          platformNumber: '2',
          expectedDeparture: '2026-10-28T02:50:00Z',
        }),
      ],
      [],
      'running',
    )

    expect(row).toMatchObject({
      sequence: 1,
      stationName: 'Kandy',
      isCalling: true,
      scheduled: '2026-10-28T02:41:00Z',
      expected: '2026-10-28T02:50:00Z',
      actualDeparture: null,
      platformNumber: '2',
    })
  })

  it('falls back to the arrival at a terminus that has no departure', () => {
    const [row] = toStopRows(
      [
        stop({
          scheduledDeparture: null,
          scheduledArrival: '2026-10-28T03:00:00Z',
          expectedDeparture: null,
          expectedArrival: '2026-10-28T03:10:00Z',
        }),
      ],
      [],
      'running',
    )

    expect(row?.scheduled).toBe('2026-10-28T03:00:00Z')
    expect(row?.expected).toBe('2026-10-28T03:10:00Z')
  })

  it('marks departed, next and upcoming calling stops from the departure logs', () => {
    const rows = toStopRows(
      [
        stop({ sequence: 1, actualDeparture: '2026-10-28T02:45:00Z' }),
        stop({ sequence: 2 }),
        stop({ sequence: 3 }),
      ],
      [],
      'running',
    )

    expect(rows.map((row) => row.state)).toEqual(['departed', 'next', 'upcoming'])
  })

  it('marks the first calling stop as next before the journey departs', () => {
    const rows = toStopRows([stop({ sequence: 1 }), stop({ sequence: 2 })], [], 'scheduled')

    expect(rows.map((row) => row.state)).toEqual(['next', 'upcoming'])
  })

  it('marks a non-calling stop in words, without a state on the timeline', () => {
    const [row] = toStopRows(
      [
        stop({
          isCalling: false,
          scheduledArrival: null,
          scheduledDeparture: null,
          platformNumber: null,
        }),
      ],
      [],
      'running',
    )

    expect(row).toMatchObject({ isCalling: false, state: 'notCalling', platformNumber: null })
  })

  it('marks the calling stops after an early termination as not served', () => {
    const rows = toStopRows(
      [
        stop({ sequence: 1, actualDeparture: '2026-10-28T02:45:00Z' }),
        stop({ sequence: 2, actualDeparture: '2026-10-28T02:55:00Z' }),
        stop({ sequence: 3 }),
      ],
      [
        change({
          id: 'c-termination',
          type: 'termination',
          values: { lastStopSequence: '2', lastStopStationId: 'st-galle' },
        }),
      ],
      'terminated',
    )

    expect(rows.map((row) => row.state)).toEqual(['departed', 'departed', 'notServed'])
  })

  it('ignores a corrected termination', () => {
    const rows = toStopRows(
      [stop({ sequence: 1, actualDeparture: '2026-10-28T02:45:00Z' }), stop({ sequence: 2 })],
      [
        change({
          id: 'c-termination',
          type: 'termination',
          values: { lastStopSequence: '1' },
          corrected: true,
        }),
      ],
      'terminated',
    )

    expect(rows.map((row) => row.state)).toEqual(['departed', 'upcoming'])
  })

  it('shows the time of the latest platform change for the stop it names', () => {
    const rows = toStopRows(
      [stop({ sequence: 1 }), stop({ sequence: 2 })],
      [
        change({
          id: 'c-old',
          type: 'platform_change',
          values: { stopSequence: '2', platformId: 'pl-1' },
          publishedAt: '2026-10-28T02:20:00Z',
        }),
        change({
          id: 'c-new',
          type: 'platform_change',
          values: { stopSequence: '2', platformId: 'pl-1' },
          publishedAt: '2026-10-28T02:40:00Z',
        }),
      ],
      'running',
    )

    expect(rows[0]?.platformChangedAt).toBeNull()
    expect(rows[1]?.platformChangedAt).toBe('2026-10-28T02:40:00Z')
  })

  it('does not show a platform change that was corrected', () => {
    const [row] = toStopRows(
      [stop({ sequence: 1 })],
      [
        change({
          id: 'c-platform',
          type: 'platform_change',
          values: { stopSequence: '1', platformId: 'pl-1' },
          corrected: true,
        }),
      ],
      'running',
    )

    expect(row?.platformChangedAt).toBeNull()
  })

  it('returns no rows for a journey with no stops', () => {
    expect(toStopRows([], [], 'running')).toEqual([])
  })
})

describe('firstScheduledDeparture', () => {
  it('takes the first calling stop in sequence order', () => {
    const stops = [
      stop({ sequence: 2, scheduledDeparture: '2026-10-28T03:00:00Z' }),
      stop({ sequence: 1, scheduledDeparture: '2026-10-28T02:30:00Z' }),
      stop({ sequence: 0, isCalling: false, scheduledDeparture: '2026-10-28T02:00:00Z' }),
    ]

    expect(firstScheduledDeparture(stops)).toBe('2026-10-28T02:30:00Z')
  })

  it('returns null when the journey has no calling stop', () => {
    expect(firstScheduledDeparture([stop({ isCalling: false })])).toBeNull()
  })

  it('returns null when the first calling stop has no scheduled departure', () => {
    expect(
      firstScheduledDeparture([stop({ scheduledDeparture: null, scheduledArrival: '2026-10-28T02:20:00Z' })]),
    ).toBeNull()
  })
})

describe('toJourneyProgress', () => {
  it('counts the calling stops and their departures, and names the last and next stop', () => {
    const rows = toStopRows(
      [
        stop({
          sequence: 1,
          stationName: 'Colombo Fort',
          actualDeparture: '2026-10-28T02:20:00Z',
          expectedDeparture: '2026-10-28T02:20:00Z',
        }),
        stop({
          sequence: 2,
          stationName: 'Gampaha',
          actualDeparture: '2026-10-28T02:55:00Z',
          expectedDeparture: '2026-10-28T02:55:00Z',
        }),
        stop({
          sequence: 3,
          stationName: 'Veyangoda',
          expectedDeparture: '2026-10-28T03:10:00Z',
        }),
      ],
      [],
      'running',
    )

    expect(toJourneyProgress(rows)).toEqual({
      departedCount: 2,
      callingCount: 3,
      lastDeparted: { stationName: 'Gampaha', at: '2026-10-28T02:55:00Z' },
      nextStop: { stationName: 'Veyangoda', expected: '2026-10-28T03:10:00Z' },
    })
  })

  it('has no next stop on a completed journey', () => {
    const rows = toStopRows(
      [stop({ sequence: 1, actualDeparture: '2026-10-28T02:45:00Z' })],
      [],
      'completed',
    )

    expect(toJourneyProgress(rows)).toMatchObject({ departedCount: 1, nextStop: null })
  })
})

describe('toPlatformNumbers', () => {
  it('maps each platform id a stop carries to its number', () => {
    const numbers = toPlatformNumbers([
      stop({ platformId: 'pl-1', platformNumber: '1' }),
      stop({ platformId: 'pl-2', platformNumber: '2' }),
    ])

    expect(numbers.get('pl-1')).toBe('1')
    expect(numbers.get('pl-2')).toBe('2')
  })

  it('leaves out a stop with no platform', () => {
    expect(toPlatformNumbers([stop({ platformId: null, platformNumber: null })]).size).toBe(0)
  })
})
