import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublishedChange } from '../types'
import { getJourneyChanges } from './journeyChanges'
import { recordChange, resetMockChanges } from './mockChangeStore'

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'

const change: PublishedChange = {
  id: 'c-1',
  type: 'cancellation',
  journeyId: JOURNEY_ID,
  values: {},
  publishedBy: 'Dev Network Controller',
  publishedAt: '2026-10-21T02:40:00Z',
  provenance: 'automatically_published',
  correctedByChangeId: null,
  correctsChangeId: null,
}

describe('getJourneyChanges', () => {
  beforeEach(() => {
    resetMockChanges()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reads the changes the mock recorded for the journey while the operations group is mocked', async () => {
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', undefined)
    recordChange(change)

    await expect(getJourneyChanges(JOURNEY_ID)).resolves.toEqual([change])
  })

  it('never calls the API while the operations group is mocked', async () => {
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', undefined)
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)

    await getJourneyChanges(JOURNEY_ID)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns no changes on the real path, because the history read is not built yet', async () => {
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', 'true')
    recordChange(change)

    await expect(getJourneyChanges(JOURNEY_ID)).resolves.toEqual([])
  })
})
