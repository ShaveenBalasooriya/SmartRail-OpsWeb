import { describe, expect, it } from 'vitest'
import type { Journey } from '../types'
import { filterJourneys, listLineOptions } from './filterJourneys'

const journeys: Journey[] = [
  {
    id: 'j1',
    serviceName: 'Kandy Express',
    lineCode: 'KDY',
    lineName: 'Main Line',
    direction: 'outbound',
    status: 'running',
    delayMinutes: null,
    lastDepartedStation: null,
    nextStation: null,
    guardName: null,
    lastUpdatedAt: '2026-10-28T02:30:00Z',
    isStale: false,
  },
  {
    id: 'j2',
    serviceName: 'Galle Local',
    lineCode: 'GLE',
    lineName: 'Coastal Line',
    direction: 'inbound',
    status: 'cancelled',
    delayMinutes: null,
    lastDepartedStation: null,
    nextStation: null,
    guardName: null,
    lastUpdatedAt: '2026-10-28T03:10:00Z',
    isStale: false,
  },
  {
    id: 'j3',
    serviceName: 'Night Mail',
    lineCode: 'KDY',
    lineName: 'Main Line',
    direction: 'inbound',
    status: 'scheduled',
    delayMinutes: null,
    lastDepartedStation: null,
    nextStation: null,
    guardName: null,
    lastUpdatedAt: '2026-10-28T12:00:00Z',
    isStale: false,
  },
]

const noFilters = { status: 'all' as const, direction: 'all' as const, line: 'all', search: '' }

describe('filterJourneys', () => {
  it('returns every journey when no filter is set', () => {
    expect(filterJourneys(journeys, noFilters)).toHaveLength(3)
  })

  it('keeps only the journeys with the chosen status', () => {
    const result = filterJourneys(journeys, { ...noFilters, status: 'cancelled' })

    expect(result.map((journey) => journey.id)).toEqual(['j2'])
  })

  it('keeps only the journeys travelling in the chosen direction', () => {
    expect(filterJourneys(journeys, { ...noFilters, direction: 'inbound' }).map((j) => j.id)).toEqual([
      'j2',
      'j3',
    ])
    expect(filterJourneys(journeys, { ...noFilters, direction: 'outbound' }).map((j) => j.id)).toEqual(['j1'])
  })

  it('keeps only the journeys on the chosen line, matched by code', () => {
    expect(filterJourneys(journeys, { ...noFilters, line: 'KDY' }).map((j) => j.id)).toEqual(['j1', 'j3'])
    expect(filterJourneys(journeys, { ...noFilters, line: 'GLE' }).map((j) => j.id)).toEqual(['j2'])
  })

  it('matches search text against the service name, ignoring case and surrounding spaces', () => {
    expect(filterJourneys(journeys, { ...noFilters, search: '  kandy ' }).map((j) => j.id)).toEqual(['j1'])
  })

  it('does not match search text against the line, which has its own filter', () => {
    expect(filterJourneys(journeys, { ...noFilters, search: 'coastal' })).toEqual([])
    expect(filterJourneys(journeys, { ...noFilters, search: 'kdy' })).toEqual([])
  })

  it('does not match a journey whose service name is absent', () => {
    const unnamed: Journey = {
      ...(journeys[0] as Journey),
      id: 'j4',
      serviceName: null,
      lineCode: null,
      lineName: null,
    }

    expect(filterJourneys([unnamed], { ...noFilters, search: 'kandy' })).toEqual([])
  })

  it('applies every facet together', () => {
    expect(filterJourneys(journeys, { status: 'running', direction: 'all', line: 'GLE', search: 'kandy' })).toEqual(
      [],
    )
  })
})

describe('filterJourneys with a terminated journey', () => {
  const withTerminated: Journey[] = [
    ...journeys,
    {
      ...(journeys[0] as Journey),
      id: 'j4',
      serviceName: 'Kandy Late',
      status: 'terminated',
    },
  ]

  it('keeps only the terminated journeys for the terminated filter', () => {
    expect(filterJourneys(withTerminated, { ...noFilters, status: 'terminated' }).map((j) => j.id)).toEqual([
      'j4',
    ])
  })
})

describe('listLineOptions', () => {
  it('lists each line once, labelled with its code and name, sorted by label', () => {
    expect(listLineOptions(journeys)).toEqual([
      { value: 'GLE', label: 'GLE Coastal Line' },
      { value: 'KDY', label: 'KDY Main Line' },
    ])
  })

  it('leaves out a journey with no line code, which the filter cannot match', () => {
    const noLine: Journey = { ...(journeys[0] as Journey), id: 'j4', lineCode: null, lineName: 'Uncoded' }

    expect(listLineOptions([noLine])).toEqual([])
  })

  it('returns nothing when no journeys have loaded', () => {
    expect(listLineOptions([])).toEqual([])
  })
})
