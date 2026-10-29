import { describe, expect, it } from 'vitest'
import type { JourneyStop } from '@/features/journeys/types'
import { stopsNoLongerServed } from './terminationPreview'

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

describe('stopsNoLongerServed', () => {
  it('lists the calling stops after the chosen last stop, in sequence order', () => {
    const rows = stopsNoLongerServed(
      [
        stop(5, { scheduledDeparture: '2026-10-28T04:00:00Z' }),
        stop(4),
        stop(3, { scheduledDeparture: '2026-10-28T03:00:00Z' }),
      ],
      3,
    )

    expect(rows.map((row) => row.sequence)).toEqual([4, 5])
    expect(rows[1]).toEqual({
      sequence: 5,
      stopLabel: 'Stop 5: Station 5',
      scheduled: '2026-10-28T04:00:00Z',
    })
  })

  it('does not list passing stops or the chosen stop itself', () => {
    const rows = stopsNoLongerServed([stop(3), stop(4, { isCalling: false }), stop(5)], 3)

    expect(rows.map((row) => row.sequence)).toEqual([5])
  })

  it('uses the arrival time at a final stop that has no departure', () => {
    const [row] = stopsNoLongerServed([stop(2, { scheduledArrival: '2026-10-28T03:10:00Z' })], 1)

    expect(row?.scheduled).toBe('2026-10-28T03:10:00Z')
  })
})
