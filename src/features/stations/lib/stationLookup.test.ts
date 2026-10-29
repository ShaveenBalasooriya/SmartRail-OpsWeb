import { describe, expect, it } from 'vitest'
import type { Station } from '../types'
import { indexStations, interchangeStationIds, platformNumber, platformsOf, stationName } from './stationLookup'

const stations: Station[] = [
  {
    id: 'st-kandy',
    code: 'KDY',
    name: 'Kandy',
    isInterchange: true,
    platforms: [
      { id: 'pl-kandy-10', stationId: 'st-kandy', number: '10' },
      { id: 'pl-kandy-2', stationId: 'st-kandy', number: '2' },
      { id: 'pl-kandy-1a', stationId: 'st-kandy', number: '1A' },
    ],
    lines: [{ id: 'ln-main', code: 'KDY', name: 'Main Line' }],
  },
  {
    id: 'st-galle',
    code: 'GLE',
    name: 'Galle',
    isInterchange: false,
    platforms: [],
    lines: [],
  },
]

describe('indexStations', () => {
  const index = indexStations(stations)

  it('resolves a station name by id', () => {
    expect(stationName(index, 'st-kandy')).toBe('Kandy')
    expect(stationName(index, 'st-galle')).toBe('Galle')
  })

  it('resolves a platform number by platform id', () => {
    expect(platformNumber(index, 'pl-kandy-2')).toBe('2')
    expect(platformNumber(index, 'pl-kandy-1a')).toBe('1A')
  })

  it('lists a station platforms in natural order, so "2" comes before "10"', () => {
    expect(platformsOf(index, 'st-kandy')?.map((platform) => platform.number)).toEqual(['1A', '2', '10'])
  })

  it('does not change the station list it was given', () => {
    const original = stations[0]?.platforms.map((platform) => platform.number)

    indexStations(stations)

    expect(stations[0]?.platforms.map((platform) => platform.number)).toEqual(original)
  })
})

describe('interchangeStationIds', () => {
  it('lists only the stations the network marks as interchanges', () => {
    const ids = interchangeStationIds(stations)

    expect(ids.has('st-kandy')).toBe(true)
    expect(ids.has('st-galle')).toBe(false)
  })

  it('returns no ids for an empty station list', () => {
    expect(interchangeStationIds([]).size).toBe(0)
  })
})

describe('stationLookup unknown ids', () => {
  const index = indexStations(stations)

  it('returns null for a station id that is not in the reference data', () => {
    expect(stationName(index, 'st-unknown')).toBeNull()
    expect(platformsOf(index, 'st-unknown')).toBeNull()
  })

  it('returns null for a platform id that is not in the reference data', () => {
    expect(platformNumber(index, 'pl-unknown')).toBeNull()
  })

  it('returns an empty list, not null, for a known station with no platforms', () => {
    expect(platformsOf(index, 'st-galle')).toEqual([])
  })

  it('returns null for everything when no stations are loaded', () => {
    const empty = indexStations([])

    expect(stationName(empty, 'st-kandy')).toBeNull()
    expect(platformNumber(empty, 'pl-kandy-2')).toBeNull()
  })
})
