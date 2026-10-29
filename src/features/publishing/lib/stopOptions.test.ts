import { describe, expect, it } from 'vitest'
import type { JourneyStop } from '@/features/journeys/types'
import { indexStations } from '@/features/stations/lib/stationLookup'
import type { Station } from '@/features/stations/types'
import {
  toNotDepartedStopOptions,
  toStopOptions,
  toTerminationStopOptions,
} from './stopOptions'

const stations: Station[] = [
  {
    id: 'st-kandy',
    code: 'KDY',
    name: 'Kandy',
    isInterchange: true,
    platforms: [{ id: 'pl-kandy-2', stationId: 'st-kandy', number: '2' }],
    lines: [],
  },
]

function stop(sequence: number, overrides: Partial<JourneyStop> = {}): JourneyStop {
  return {
    sequence,
    stationId: 'st-kandy',
    stationName: 'Kandy',
    isCalling: true,
    scheduledArrival: null,
    scheduledDeparture: null,
    expectedArrival: null,
    expectedDeparture: null,
    actualDeparture: null,
    platformId: 'pl-kandy-2',
    platformNumber: '2',
    ...overrides,
  }
}

describe('toStopOptions', () => {
  const index = indexStations(stations)

  it('offers only calling stops, in sequence order, with the current platform', () => {
    const options = toStopOptions(
      [stop(3), stop(1, { isCalling: false, platformId: null }), stop(2, { platformId: null })],
      index,
    )

    expect(options.map((option) => option.sequence)).toEqual([2, 3])
    expect(options[1]).toEqual({
      sequence: 3,
      stationId: 'st-kandy',
      stationName: 'Kandy',
      platformId: 'pl-kandy-2',
      label: 'Stop 3: Kandy',
    })
  })

  it('labels a stop whose station is unknown with a visible fallback', () => {
    const [option] = toStopOptions([stop(1, { stationId: 'st-unknown' })], index)

    expect(option?.stationName).toBeNull()
    expect(option?.label).toBe('Stop 1: Unknown station')
  })

  it('labels a stop the operations response gave no station for with the same fallback', () => {
    const [option] = toStopOptions([stop(1, { stationId: null })], index)

    expect(option?.stationName).toBeNull()
    expect(option?.label).toBe('Stop 1: Unknown station')
  })

  it('does not reorder the input array', () => {
    const stops = [stop(2), stop(1)]

    toStopOptions(stops, index)

    expect(stops.map((item) => item.sequence)).toEqual([2, 1])
  })
})

describe('toNotDepartedStopOptions', () => {
  const index = indexStations(stations)

  it('drops a calling stop the train has already left', () => {
    const options = toNotDepartedStopOptions(
      [stop(1, { actualDeparture: '2026-10-28T02:31:00Z' }), stop(2), stop(3)],
      index,
    )

    expect(options.map((option) => option.sequence)).toEqual([2, 3])
  })

  it('keeps every calling stop before departure and never a passing stop', () => {
    const options = toNotDepartedStopOptions([stop(1), stop(2, { isCalling: false })], index)

    expect(options.map((option) => option.sequence)).toEqual([1])
  })
})

describe('toTerminationStopOptions', () => {
  const index = indexStations(stations)

  it('offers the calling stops except the final one, in sequence order', () => {
    const options = toTerminationStopOptions([stop(1), stop(2), stop(3), stop(4)], index)

    expect(options.map((option) => option.sequence)).toEqual([1, 2, 3])
  })

  it('offers nothing when the journey has only one calling stop', () => {
    expect(toTerminationStopOptions([stop(1)], index)).toEqual([])
  })

  it('treats the final calling stop as the last one even when a passing stop comes after it', () => {
    const options = toTerminationStopOptions(
      [stop(1), stop(2), stop(3, { isCalling: false, platformId: null })],
      index,
    )

    expect(options.map((option) => option.sequence)).toEqual([1])
  })

  it('drops the stops at or before the last departure', () => {
    const options = toTerminationStopOptions(
      [
        stop(1, { actualDeparture: '2026-10-28T02:31:00Z' }),
        stop(2, { actualDeparture: '2026-10-28T02:55:00Z' }),
        stop(3),
        stop(4),
      ],
      index,
    )

    expect(options.map((option) => option.sequence)).toEqual([3])
  })
})
