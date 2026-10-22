import { platformNumber, stationName, type StationIndex } from '@/features/stations/lib/stationLookup'
import type { StopLiveRow } from './applyChanges'

// One row of the stop list. Names and platform numbers are null when the reference data does not know
// the id; the component shows the visible fallback, so a missing lookup is never a blank cell.
export type StopRow = {
  sequence: number
  stationName: string | null
  isInterchange: boolean
  isCalling: boolean
  arrival: string | null
  departure: string | null
  // The expected departure, or the expected arrival at the final stop, which has no departure. null when no
  // delay applies. The Expected column shows this, so a delayed stop is never shown with only its schedule.
  expectedTime: string | null
  isServed: boolean
  platformNumber: string | null
  // Set only when a published platform change moved the stop; the list says so in text, with this time.
  platformChangedAt: string | null
}

// Pure, so the join and the ordering can be tested without React. The input is copied before sorting,
// so the query cache's array is never reordered in place.
export function toStopRows(stops: readonly StopLiveRow[], stationIndex: StationIndex): StopRow[] {
  return [...stops]
    .sort((a, b) => a.sequence - b.sequence)
    .map((stop) => ({
      sequence: stop.sequence,
      stationName: stationName(stationIndex, stop.stationId),
      isInterchange: stationIndex.stationsById.get(stop.stationId)?.isInterchange ?? false,
      isCalling: stop.isCalling,
      arrival: stop.scheduledArrival,
      departure: stop.scheduledDeparture,
      expectedTime: stop.expectedDeparture ?? stop.expectedArrival,
      isServed: stop.isServed,
      platformNumber: stop.platformId === null ? null : platformNumber(stationIndex, stop.platformId),
      platformChangedAt: stop.platformChangedAt,
    }))
}
