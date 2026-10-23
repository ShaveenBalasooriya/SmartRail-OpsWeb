import { describe, expect, it } from 'vitest'
import type { Journey, JourneyStatus } from '../types'
import { boardStatusNote } from './boardStatusNote'

function journey(id: string, status: JourneyStatus | null): Journey {
  return {
    id,
    serviceName: 'Kandy Express',
    lineCode: 'KDY',
    lineName: 'Main Line',
    direction: 'outbound',
    scheduledDepartureAt: '2026-10-21T02:30:00Z',
    status,
  }
}

describe('boardStatusNote', () => {
  it('says status is not available yet when no journey reports one', () => {
    expect(boardStatusNote([journey('j1', null), journey('j2', null)])).toBe(
      'Live status is not available yet, so status filters match nothing. Scheduled times are shown.',
    )
  })

  it('says which journeys show a status when only some report one', () => {
    expect(boardStatusNote([journey('j1', 'cancelled'), journey('j2', null)])).toBe(
      'Only journeys with a published change show a status. The others show Not reported.',
    )
  })

  it('says nothing when every journey reports a status', () => {
    expect(boardStatusNote([journey('j1', 'running'), journey('j2', 'terminated')])).toBeNull()
  })
})
