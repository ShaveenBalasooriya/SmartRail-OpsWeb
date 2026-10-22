import { api } from '@/shared/api/client'
import { isMocked } from '@/shared/api/mockSwitch'
import type { DelayInput, PlatformChangeInput, PublishedChange } from '../types'
import { mockPublishCancellation, mockPublishDelay, mockPublishPlatformChange } from './publish.mock'

// The request bodies and the response shape are ASSUMED from the OpenSpec change add-controller-operations.
// The spec states the rules (minutes 1 to 720, platform of the same station, and so on) but not the field
// names. The wire field names follow the change's design.md (D1): fromStopSequence and stopSequence. The UI
// inputs keep the shorter names. Confirm both against /openapi/v1.json when the endpoints ship.

export async function publishDelay(journeyId: string, input: DelayInput): Promise<PublishedChange> {
  if (isMocked('operations')) {
    return mockPublishDelay(journeyId, input)
  }

  return api.post<PublishedChange, { fromStopSequence: number; minutes: number }>(
    `/api/v1/operations/journeys/${encodeURIComponent(journeyId)}/delays`,
    { fromStopSequence: input.fromSequence, minutes: input.minutes },
  )
}

export async function publishCancellation(journeyId: string): Promise<PublishedChange> {
  if (isMocked('operations')) {
    return mockPublishCancellation(journeyId)
  }

  return api.post<PublishedChange>(`/api/v1/operations/journeys/${encodeURIComponent(journeyId)}/cancellation`)
}

export async function publishPlatformChange(
  journeyId: string,
  input: PlatformChangeInput,
): Promise<PublishedChange> {
  if (isMocked('operations')) {
    return mockPublishPlatformChange(journeyId, input)
  }

  return api.post<PublishedChange, { stopSequence: number; platformId: string }>(
    `/api/v1/operations/journeys/${encodeURIComponent(journeyId)}/platform-changes`,
    { stopSequence: input.sequence, platformId: input.platformId },
  )
}
