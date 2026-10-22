import { describe, expect, it } from 'vitest'
import type { JourneyStop } from '@/features/journeys/types'
import { indexStations } from '@/features/stations/lib/stationLookup'
import type { Station } from '@/features/stations/types'
import { toStopOptions, toTerminationStopOptions } from './stopOptions'

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
    isCalling: true,
    scheduledArrival: null,
    scheduledDeparture: null,
    platformId: 'pl-kandy-2',
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

  it('does not reorder the input array', () => {
    const stops = [stop(2), stop(1)]

    toStopOptions(stops, index)

    expect(stops.map((item) => item.sequence)).toEqual([2, 1])
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
})
