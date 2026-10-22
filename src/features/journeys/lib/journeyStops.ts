import { platformNumber, stationName, type StationIndex } from '@/features/stations/lib/stationLookup'
import type { JourneyStop } from '../types'

// One row of the stop list. Names and platform numbers are null when the reference data does not know
// the id; the component shows the visible fallback, so a missing lookup is never a blank cell.
export type StopRow = {
  sequence: number
  stationName: string | null
  isInterchange: boolean
  isCalling: boolean
  arrival: string | null
  departure: string | null
  platformNumber: string | null
}

// Pure, so the join and the ordering can be tested without React. The input is copied before sorting,
// so the query cache's array is never reordered in place.
export function toStopRows(stops: readonly JourneyStop[], stationIndex: StationIndex): StopRow[] {
  return [...stops]
    .sort((a, b) => a.sequence - b.sequence)
    .map((stop) => ({
      sequence: stop.sequence,
      stationName: stationName(stationIndex, stop.stationId),
      isInterchange: stationIndex.stationsById.get(stop.stationId)?.isInterchange ?? false,
      isCalling: stop.isCalling,
      arrival: stop.scheduledArrival,
      departure: stop.scheduledDeparture,
      platformNumber: stop.platformId === null ? null : platformNumber(stationIndex, stop.platformId),
    }))
}
