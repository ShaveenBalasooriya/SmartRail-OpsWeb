import { api } from '@/shared/api/client'
import type { DelayInput, PlatformChangeInput, PublishedChange, TerminationInput } from '../types'

// The request and response shapes are checked against the running API's /openapi/v1.json on 2026-10-28:
// PublishDelayRequest (fromStopSequence, minutes), PublishPlatformChangeRequest (stopSequence, platformId),
// PublishTerminationRequest (lastStopSequence), and ControllerChangeResponse for every 201. The
// cancellation and correction endpoints take no request body. The UI inputs keep shorter names.
//
// Every call talks to the real API. Nothing here can fall back to an in-memory answer, so a broken
// integration fails visibly instead of being hidden.

export async function publishDelay(journeyId: string, input: DelayInput): Promise<PublishedChange> {
  return api.post<PublishedChange, { fromStopSequence: number; minutes: number }>(
    `/api/v1/operations/journeys/${encodeURIComponent(journeyId)}/delays`,
    { fromStopSequence: input.fromSequence, minutes: input.minutes },
  )
}

export async function publishCancellation(journeyId: string): Promise<PublishedChange> {
  return api.post<PublishedChange>(`/api/v1/operations/journeys/${encodeURIComponent(journeyId)}/cancellation`)
}

export async function publishPlatformChange(
  journeyId: string,
  input: PlatformChangeInput,
): Promise<PublishedChange> {
  return api.post<PublishedChange, { stopSequence: number; platformId: string }>(
    `/api/v1/operations/journeys/${encodeURIComponent(journeyId)}/platform-changes`,
    { stopSequence: input.sequence, platformId: input.platformId },
  )
}

export async function publishTermination(journeyId: string, input: TerminationInput): Promise<PublishedChange> {
  return api.post<PublishedChange, { lastStopSequence: number }>(
    `/api/v1/operations/journeys/${encodeURIComponent(journeyId)}/termination`,
    { lastStopSequence: input.lastStopSequence },
  )
}

// A correction names only the change it withdraws. The journey is the change's own, so the URL carries
// no journey id, and the API returns the correction as a change of type 'correction'.
export async function publishCorrection(changeId: string): Promise<PublishedChange> {
  return api.post<PublishedChange>(`/api/v1/operations/changes/${encodeURIComponent(changeId)}/corrections`)
}
