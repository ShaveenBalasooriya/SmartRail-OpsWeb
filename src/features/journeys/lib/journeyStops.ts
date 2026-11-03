import type { PublishedChange } from '@/features/publishing/types'
import type { JourneyStatus, JourneyStop } from '../types'

// Where one stop sits in the journey's progress. "notServed" is a calling stop after an early termination,
// which the design file 11 marks as "Not served"; "notCalling" is a stop the train passes without stopping.
export type StopState = 'departed' | 'next' | 'upcoming' | 'notServed' | 'notCalling'

// One row of the stop list. The names and numbers come from the journey response itself; a null is shown
// as a visible fallback, so a missing value is never a blank cell. The platform-change time is the
// published time of the latest uncorrected platform change for this stop, or null when none applies.
export type StopRow = {
  sequence: number
  // Kept so reference data (the station's Interchange flag) can be joined without matching on a name.
  stationId: string | null
  stationName: string | null
  isCalling: boolean
  state: StopState
  // The scheduled departure, or the scheduled arrival at the final stop, which has no departure.
  scheduled: string | null
  // The expected departure, or the expected arrival at the final stop, which has no departure.
  expected: string | null
  actualDeparture: string | null
  platformNumber: string | null
  platformChangedAt: string | null
}

// Pure, so the ordering and the derived state can be tested without React. The input is copied before
// sorting, so the query cache's array is never reordered in place.
export function toStopRows(
  stops: readonly JourneyStop[],
  changes: readonly PublishedChange[],
  status: JourneyStatus,
): StopRow[] {
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence)
  const terminationSequence = terminationStopSequence(changes, status)
  const platformChangeTimes = platformChangeTimesByStop(changes)
  const nextSequence = nextCallingSequence(sorted, terminationSequence, status)

  return sorted.map((stop) => {
    const isNotServed = isAfterTermination(stop, terminationSequence)
    return {
      sequence: stop.sequence,
      stationId: stop.stationId,
      stationName: stop.stationName,
      isCalling: stop.isCalling,
      state: stateOf(stop, isNotServed, nextSequence),
      scheduled: stop.scheduledDeparture ?? stop.scheduledArrival,
      expected: stop.expectedDeparture ?? stop.expectedArrival,
      actualDeparture: stop.actualDeparture,
      platformNumber: stop.platformNumber,
      // A platform change for a stop the train no longer serves is not shown: the change no longer applies.
      platformChangedAt: isNotServed ? null : platformChangeTimes.get(stop.sequence) ?? null,
    }
  })
}

// The scheduled departure shown in the details grid: the first calling stop's scheduled departure. The
// brief names that field specifically, so a missing departure is shown as a dash rather than passing an
// arrival off as a departure.
export function firstScheduledDeparture(stops: readonly JourneyStop[]): string | null {
  const first = [...stops]
    .filter((stop) => stop.isCalling)
    .sort((a, b) => a.sequence - b.sequence)[0]

  return first?.scheduledDeparture ?? null
}

// What the progress bar says. departedCount counts the calling stops the guard has logged a departure
// for; callingCount is every calling stop, including any after a termination, so the bar never claims
// the whole journey is done when it was cut short.
export type JourneyProgress = {
  departedCount: number
  callingCount: number
  lastDeparted: { stationName: string | null; at: string } | null
  nextStop: { stationName: string | null; expected: string | null } | null
}

// Built from the same rows the table shows, so the bar and the timeline cannot disagree.
export function toJourneyProgress(rows: readonly StopRow[]): JourneyProgress {
  const calling = rows.filter((row) => row.isCalling)
  const departed = calling.filter(
    (row): row is StopRow & { actualDeparture: string } =>
      row.state === 'departed' && row.actualDeparture !== null,
  )
  const lastDeparted = departed.at(-1) ?? null
  const next = calling.find((row) => row.state === 'next') ?? null

  return {
    departedCount: departed.length,
    callingCount: calling.length,
    lastDeparted:
      lastDeparted === null
        ? null
        : { stationName: lastDeparted.stationName, at: lastDeparted.actualDeparture },
    nextStop: next === null ? null : { stationName: next.stationName, expected: next.expected },
  }
}

// Platform numbers keyed by platform id. A platform-change record names platforms only by id, so the
// change history uses the numbers the journey's own stops already carry instead of fetching stations.
export function toPlatformNumbers(stops: readonly JourneyStop[]): Map<string, string> {
  const numbers = new Map<string, string>()

  for (const stop of stops) {
    if (stop.platformId !== null && stop.platformNumber !== null) {
      numbers.set(stop.platformId, stop.platformNumber)
    }
  }

  return numbers
}

function stateOf(stop: JourneyStop, isNotServed: boolean, nextSequence: number | null): StopState {
  if (!stop.isCalling) {
    return 'notCalling'
  }

  if (isNotServed) {
    return 'notServed'
  }

  if (stop.actualDeparture !== null) {
    return 'departed'
  }

  return stop.sequence === nextSequence ? 'next' : 'upcoming'
}

// The stop the train is heading for: the first calling stop with no departure log. A scheduled journey's
// first calling stop is its next stop; a cancelled, terminated or completed journey has none because no
// further stop will be served.
function nextCallingSequence(
  stops: readonly JourneyStop[],
  terminationSequence: number | null,
  status: JourneyStatus,
): number | null {
  if (status !== 'scheduled' && status !== 'running') {
    return null
  }

  const next = stops.find(
    (stop) =>
      stop.isCalling &&
      stop.actualDeparture === null &&
      !isAfterTermination(stop, terminationSequence),
  )

  return next?.sequence ?? null
}

function isAfterTermination(stop: JourneyStop, terminationSequence: number | null): boolean {
  return (
    stop.isCalling && terminationSequence !== null && stop.sequence > terminationSequence
  )
}

// The server's termination record names the last stop served. A corrected termination no longer applies,
// so only an uncorrected one is read.
function terminationStopSequence(
  changes: readonly PublishedChange[],
  status: JourneyStatus,
): number | null {
  if (status !== 'terminated') {
    return null
  }

  const termination = [...changes]
    .filter((change) => change.type === 'termination' && !change.corrected)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0]
  const sequence = termination === undefined ? Number.NaN : Number(termination.values.lastStopSequence)

  return Number.isInteger(sequence) && sequence > 0 ? sequence : null
}

// One published time per stop, from the latest uncorrected platform change for it. A corrected change is
// skipped because the platform it named no longer applies.
function platformChangeTimesByStop(changes: readonly PublishedChange[]): Map<number, string> {
  const times = new Map<number, string>()
  const ordered = [...changes]
    .filter((change) => change.type === 'platform_change' && !change.corrected)
    .sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))

  for (const change of ordered) {
    const sequence = Number(change.values.stopSequence)
    if (Number.isInteger(sequence) && sequence > 0) {
      times.set(sequence, change.publishedAt)
    }
  }

  return times
}
