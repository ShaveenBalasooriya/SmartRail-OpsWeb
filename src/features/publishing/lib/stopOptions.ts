import { stationName, type StationIndex } from '@/features/stations/lib/stationLookup'
import type { JourneyStop } from '@/features/journeys/types'

export type StopOption = {
  sequence: number
  stationId: string
  stationName: string | null
  // The platform the stop has today. A platform change is validated against it.
  platformId: string | null
  label: string
}

// A stop that is not called at cannot be delayed or re-platformed, so only calling stops are offered.
export function toStopOptions(stops: readonly JourneyStop[], stationIndex: StationIndex): StopOption[] {
  return stops
    .filter((stop) => stop.isCalling)
    .sort((a, b) => a.sequence - b.sequence)
    .map((stop) => {
      const name = stationName(stationIndex, stop.stationId)
      return {
        sequence: stop.sequence,
        stationId: stop.stationId,
        stationName: name,
        platformId: stop.platformId,
        label: `Stop ${stop.sequence}: ${name ?? 'Unknown station'}`,
      }
    })
}

// An early termination ends the journey after the chosen stop, so the final calling stop is not offered: ending
// there is not an early termination. The stops are the calling stops in sequence order, so the final one is last.
export function toTerminationStopOptions(stops: readonly JourneyStop[], stationIndex: StationIndex): StopOption[] {
  return toStopOptions(stops, stationIndex).slice(0, -1)
}
