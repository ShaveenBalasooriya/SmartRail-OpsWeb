import { beforeEach, describe, expect, it } from 'vitest'
import type { PublishedChange } from '../types'
import { getChanges, recordChange, resetMockChanges } from './mockChangeStore'

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'
const OTHER_JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000002'

function change(id: string, journeyId = JOURNEY_ID): PublishedChange {
  return {
    id,
    type: 'cancellation',
    journeyId,
    values: {},
    publishedBy: 'Dev Network Controller',
    publishedAt: '2026-10-21T02:40:00Z',
    provenance: 'automatically_published',
    correctedByChangeId: null,
    correctsChangeId: null,
  }
}

describe('mock change store', () => {
  beforeEach(() => {
    resetMockChanges()
  })

  it('returns no changes for a journey nothing was published on', () => {
    expect(getChanges(JOURNEY_ID)).toEqual([])
  })

  it('keeps the changes of each journey apart, in the order they were recorded', () => {
    recordChange(change('c1'))
    recordChange(change('c2', OTHER_JOURNEY_ID))
    recordChange(change('c3'))

    expect(getChanges(JOURNEY_ID).map((item) => item.id)).toEqual(['c1', 'c3'])
    expect(getChanges(OTHER_JOURNEY_ID).map((item) => item.id)).toEqual(['c2'])
  })

  it('returns a copy, so editing the returned array does not change the store', () => {
    recordChange(change('c1'))

    getChanges(JOURNEY_ID).push(change('intruder'))

    expect(getChanges(JOURNEY_ID).map((item) => item.id)).toEqual(['c1'])
  })

  it('forgets every change when reset', () => {
    recordChange(change('c1'))

    resetMockChanges()

    expect(getChanges(JOURNEY_ID)).toEqual([])
  })
})
