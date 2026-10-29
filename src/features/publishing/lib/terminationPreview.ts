import type { JourneyStop } from '@/features/journeys/types'

// One stop an early termination removes from the journey. The scheduled time stays a UTC instant for the
// component to format.
export type NotServedRow = {
  sequence: number
  stopLabel: string
  scheduled: string | null
}

// Every calling stop after the chosen last stop served. Passing stops are not listed: the train never served
// them, so a termination does not change them.
export function stopsNoLongerServed(
  stops: readonly JourneyStop[],
  lastStopSequence: number,
): NotServedRow[] {
  return stops
    .filter((stop) => stop.isCalling && stop.sequence > lastStopSequence)
    .sort((a, b) => a.sequence - b.sequence)
    .map((stop) => ({
      sequence: stop.sequence,
      stopLabel: `Stop ${stop.sequence}: ${stop.stationName ?? 'Unknown station'}`,
      scheduled: stop.scheduledDeparture ?? stop.scheduledArrival,
    }))
}
