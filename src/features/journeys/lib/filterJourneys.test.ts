import { describe, expect, it } from 'vitest'
import type { Journey } from '../types'
import { filterJourneys } from './filterJourneys'

const journeys: Journey[] = [
  {
    id: 'j1',
    serviceName: 'Kandy Express',
    lineCode: 'KDY',
    lineName: 'Main Line',
    direction: 'outbound',
    scheduledDepartureAt: '2026-10-21T02:30:00Z',
    status: 'running',
  },
  {
    id: 'j2',
    serviceName: 'Galle Local',
    lineCode: 'GLE',
    lineName: 'Coastal Line',
    direction: 'inbound',
    scheduledDepartureAt: '2026-10-21T03:10:00Z',
    status: 'cancelled',
  },
  {
    id: 'j3',
    serviceName: 'Night Mail',
    lineCode: 'KDY',
    lineName: 'Main Line',
    direction: 'inbound',
    scheduledDepartureAt: '2026-10-21T12:00:00Z',
    status: null,
  },
]

describe('filterJourneys', () => {
  it('returns every journey when neither filter is set', () => {
    expect(filterJourneys(journeys, { status: 'all', search: '' })).toHaveLength(3)
  })

  it('keeps only the journeys with the chosen status', () => {
    const result = filterJourneys(journeys, { status: 'cancelled', search: '' })

    expect(result.map((journey) => journey.id)).toEqual(['j2'])
  })

  it('matches search text against the service name and the line, ignoring case and surrounding spaces', () => {
    expect(filterJourneys(journeys, { status: 'all', search: '  kandy ' }).map((j) => j.id)).toEqual(['j1'])
    expect(filterJourneys(journeys, { status: 'all', search: 'coastal' }).map((j) => j.id)).toEqual(['j2'])
    expect(filterJourneys(journeys, { status: 'all', search: 'kdy' }).map((j) => j.id)).toEqual(['j1', 'j3'])
  })

  it('applies both facets together', () => {
    expect(filterJourneys(journeys, { status: 'running', search: 'galle' })).toEqual([])
  })

  it('never matches a journey without a reported status to a specific status filter', () => {
    expect(filterJourneys(journeys, { status: 'scheduled', search: '' })).toEqual([])
  })
})
