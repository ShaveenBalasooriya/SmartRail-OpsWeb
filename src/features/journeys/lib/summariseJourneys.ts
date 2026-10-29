import type { Journey } from '../types'

export type JourneySummaryCounts = {
  running: number
  late: number
  cancelled: number
  stale: number
}

// The board's summary tiles, from the loaded rows only. "Late" follows the design's rule: a positive delay
// on a journey that is still in play, so a completed or cancelled journey never counts as running late.
// Staleness is the API's own flag, not a client-side age calculation.
export function summariseJourneys(journeys: readonly Journey[]): JourneySummaryCounts {
  return journeys.reduce<JourneySummaryCounts>(
    (counts, journey) => {
      if (journey.status === 'running') {
        counts.running += 1
      }

      if (
        journey.delayMinutes !== null &&
        journey.delayMinutes > 0 &&
        journey.status !== 'completed' &&
        journey.status !== 'cancelled'
      ) {
        counts.late += 1
      }

      if (journey.status === 'cancelled') {
        counts.cancelled += 1
      }

      if (journey.isStale) {
        counts.stale += 1
      }

      return counts
    },
    { running: 0, late: 0, cancelled: 0, stale: 0 },
  )
}
