import type { JourneyStop } from '@/features/journeys/types'

// One row of the delay drawer's downstream preview. The times stay UTC instants here; the component formats
// them as railway time. A null is a time the API has not reported and is shown as a dash, never invented.
export type DelayPreviewRow = {
  sequence: number
  stopLabel: string
  scheduled: string | null
  nowExpected: string | null
  newExpected: string | null
}

// The design's New expected is the journey's current expectation plus the delay, for the chosen stop and every
// later calling stop. It is an estimate only: the server applies a delay and owns the published times, so the
// drawer captions the table and never presents these values as the API's.
export function toDownstreamPreview(
  stops: readonly JourneyStop[],
  fromSequence: number,
  minutes: number,
): DelayPreviewRow[] {
  return stops
    .filter((stop) => stop.isCalling && stop.sequence >= fromSequence)
    .sort((a, b) => a.sequence - b.sequence)
    .map((stop) => {
      const scheduled = stop.scheduledDeparture ?? stop.scheduledArrival
      const nowExpected = stop.expectedDeparture ?? stop.expectedArrival ?? scheduled

      return {
        sequence: stop.sequence,
        stopLabel: `Stop ${stop.sequence}: ${stop.stationName ?? 'Unknown station'}`,
        scheduled,
        nowExpected,
        newExpected: nowExpected === null ? null : addMinutes(nowExpected, minutes),
      }
    })
}

// Adds whole minutes to a UTC instant. A value the API sent that is not a parseable instant becomes null rather
// than an Invalid Date reaching the table.
export function addMinutes(instant: string, minutes: number): string | null {
  const milliseconds = Date.parse(instant)
  if (Number.isNaN(milliseconds)) {
    return null
  }

  return new Date(milliseconds + minutes * 60_000).toISOString()
}
