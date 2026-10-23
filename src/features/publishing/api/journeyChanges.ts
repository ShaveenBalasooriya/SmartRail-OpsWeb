import { isMocked } from '@/shared/api/mockSwitch'
import type { PublishedChange } from '../types'
import { getChanges } from './mockChangeStore'

// The published changes on one journey. The real read is not built: GET /operations/journeys/{id} arrives with
// add-controller-operations and carries the change history. Until then the real path returns no changes, so
// a journey shows "No changes published" even if changes were published on the server. Replace this when the
// endpoint exists.
export async function getJourneyChanges(journeyId: string): Promise<PublishedChange[]> {
  if (isMocked('operations')) {
    return getChanges(journeyId)
  }

  return []
}
