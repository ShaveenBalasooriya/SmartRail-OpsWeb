import { describe, expect, it } from 'vitest'
import type { JourneyStop } from '@/features/journeys/types'
import { addMinutes, toDownstreamPreview } from './delayPreview'

function stop(sequence: number, overrides: Partial<JourneyStop> = {}): JourneyStop {
  return {
    sequence,
    stationId: `st-${sequence}`,
    stationName: `Station ${sequence}`,
    isCalling: true,
    scheduledArrival: null,
    scheduledDeparture: null,
    expectedArrival: null,
    expectedDeparture: null,
    actualDeparture: null,
    platformId: null,
    platformNumber: null,
    ...overrides,
  }
}

describe('addMinutes', () => {
  it('adds whole minutes to a UTC instant', () => {
    expect(addMinutes('2026-10-28T02:30:00Z', 15)).toBe('2026-10-28T02:45:00.000Z')
  })

  it('returns null for an instant that cannot be parsed', () => {
    expect(addMinutes('not-a-time', 5)).toBeNull()
  })
})

describe('toDownstreamPreview', () => {
  it('previews the chosen calling stop and every later one, in sequence order', () => {
    const rows = toDownstreamPreview(
      [
        stop(4, {
          stationName: 'Polgahawela',
          scheduledDeparture: '2026-10-28T01:55:00Z',
          expectedDeparture: '2026-10-28T01:58:00Z',
        }),
        stop(3, { stationName: 'Ragama' }),
        stop(5, {
          stationName: 'Peradeniya Junction',
          scheduledDeparture: '2026-10-28T02:20:00Z',
          expectedDeparture: '2026-10-28T02:23:00Z',
        }),
      ],
      4,
      12,
    )

    expect(rows.map((row) => row.sequence)).toEqual([4, 5])
    expect(rows[0]).toEqual({
      sequence: 4,
      stopLabel: 'Stop 4: Polgahawela',
      scheduled: '2026-10-28T01:55:00Z',
      nowExpected: '2026-10-28T01:58:00Z',
      newExpected: '2026-10-28T02:10:00.000Z',
    })
    expect(rows[1].newExpected).toBe('2026-10-28T02:35:00.000Z')
  })

  it('skips passing stops, which a delay never applies to', () => {
    const rows = toDownstreamPreview([stop(2, { isCalling: false }), stop(3)], 2, 5)

    expect(rows.map((row) => row.sequence)).toEqual([3])
  })

  it('falls back to the scheduled time when the API has no expectation, and to the arrival at a final stop', () => {
    const rows = toDownstreamPreview(
      [
        stop(2, { scheduledDeparture: '2026-10-28T02:00:00Z', expectedDeparture: null }),
        stop(3, { scheduledDeparture: null, scheduledArrival: '2026-10-28T03:00:00Z' }),
      ],
      2,
      10,
    )

    expect(rows[0].nowExpected).toBe('2026-10-28T02:00:00Z')
    expect(rows[1].nowExpected).toBe('2026-10-28T03:00:00Z')
    expect(rows[1].scheduled).toBe('2026-10-28T03:00:00Z')
  })

  it('shows a dash rather than inventing a time when nothing is on record', () => {
    const [row] = toDownstreamPreview([stop(2)], 2, 10)

    expect(row?.scheduled).toBeNull()
    expect(row?.nowExpected).toBeNull()
    expect(row?.newExpected).toBeNull()
  })

  it('labels a stop whose station name is missing with a visible fallback', () => {
    const [row] = toDownstreamPreview([stop(2, { stationName: null })], 2, 1)

    expect(row?.stopLabel).toBe('Stop 2: Unknown station')
  })
})
