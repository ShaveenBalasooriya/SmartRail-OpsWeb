import { describe, expect, it } from 'vitest'
import type { Journey } from '../types'
import { summariseJourneys } from './summariseJourneys'

function journey(overrides: Partial<Journey> & Pick<Journey, 'id'>): Journey {
  return {
    serviceName: 'Kandy Express',
    lineCode: 'KDY',
    lineName: 'Main Line',
    direction: 'outbound',
    status: 'scheduled',
    delayMinutes: 0,
    lastDepartedStation: null,
    nextStation: null,
    guardName: null,
    lastUpdatedAt: '2026-10-28T02:30:00Z',
    isStale: false,
    ...overrides,
  }
}

describe('summariseJourneys', () => {
  it('returns zeros for an empty board', () => {
    expect(summariseJourneys([])).toEqual({ running: 0, late: 0, cancelled: 0, stale: 0 })
  })

  it('counts the running journeys', () => {
    const counts = summariseJourneys([
      journey({ id: 'j1', status: 'running' }),
      journey({ id: 'j2', status: 'running' }),
      journey({ id: 'j3', status: 'scheduled' }),
    ])

    expect(counts.running).toBe(2)
  })

  it('counts a positive delay as late, but not a cancelled or completed journey', () => {
    const counts = summariseJourneys([
      journey({ id: 'j1', status: 'running', delayMinutes: 7 }),
      journey({ id: 'j2', status: 'scheduled', delayMinutes: 2 }),
      journey({ id: 'j3', status: 'completed', delayMinutes: 9 }),
      journey({ id: 'j4', status: 'cancelled', delayMinutes: 4 }),
      journey({ id: 'j5', status: 'running', delayMinutes: 0 }),
      journey({ id: 'j6', status: 'running', delayMinutes: -3 }),
      journey({ id: 'j7', status: 'running', delayMinutes: null }),
    ])

    expect(counts.late).toBe(2)
  })

  it('counts cancelled journeys separately from the running ones', () => {
    const counts = summariseJourneys([
      journey({ id: 'j1', status: 'cancelled' }),
      journey({ id: 'j2', status: 'terminated' }),
    ])

    expect(counts.cancelled).toBe(1)
    expect(counts.running).toBe(0)
  })

  it('counts the journeys the API flags as stale', () => {
    const counts = summariseJourneys([
      journey({ id: 'j1', isStale: true }),
      journey({ id: 'j2', isStale: false }),
      journey({ id: 'j3', isStale: true }),
    ])

    expect(counts.stale).toBe(2)
  })
})
