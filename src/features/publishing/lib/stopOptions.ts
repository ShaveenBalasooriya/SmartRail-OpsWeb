import { stationName, type StationIndex } from '@/features/stations/lib/stationLookup'
import type { JourneyStop } from '@/features/journeys/types'

export type StopOption = {
  sequence: number
  stationId: string | null
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
      const name = stop.stationId === null ? null : stationName(stationIndex, stop.stationId)
      return {
        sequence: stop.sequence,
        stationId: stop.stationId,
        stationName: name,
        platformId: stop.platformId,
        label: `Stop ${stop.sequence}: ${name ?? 'Unknown station'}`,
      }
    })
}

// A delay starts at a stop the train has not left yet. A stop with a departure log has already gone, so the
// server would refuse a delay from it; offering it would only produce a 409 after the review step.
export function toNotDepartedStopOptions(
  stops: readonly JourneyStop[],
  stationIndex: StationIndex,
): StopOption[] {
  return toStopOptions(stops, stationIndex).filter((option) => {
    const stop = stops.find((candidate) => candidate.sequence === option.sequence)
    return stop !== undefined && stop.actualDeparture === null
  })
}

// An early termination ends the journey after the chosen stop, so the final calling stop is not offered: ending
// there is not an early termination. It also cannot end at a stop the train has already left, so everything up
// to and including the last departure is dropped. The stops are the calling stops in sequence order, so the
// final one is last.
export function toTerminationStopOptions(stops: readonly JourneyStop[], stationIndex: StationIndex): StopOption[] {
  const lastDepartedSequence = stops
    .filter((stop) => stop.isCalling && stop.actualDeparture !== null)
    .reduce<number | null>((latest, stop) => (latest === null || stop.sequence > latest ? stop.sequence : latest), null)

  return toStopOptions(stops, stationIndex)
    .slice(0, -1)
    .filter((option) => lastDepartedSequence === null || option.sequence > lastDepartedSequence)
}
