import type { PublishedChange } from '@/features/publishing/types'
import type { JourneyDetail, JourneyStatus, JourneyStop } from '../types'

// One stop as the controller sees it now: the scheduled times, plus what the published changes have done to it.
export type StopLiveRow = JourneyStop & {
  // null when no delay applies to the stop, or when the stop is no longer served. Never a guessed time.
  expectedArrival: string | null
  expectedDeparture: string | null
  // False for every stop of a cancelled journey, and for stops after an early termination's last stop.
  isServed: boolean
  // The publish time of the platform change that set platformId, or null when the platform is the timetable's.
  platformChangedAt: string | null
}

export type JourneyLiveView = {
  status: JourneyStatus | null
  stops: StopLiveRow[]
}

const MS_PER_MINUTE = 60_000

// The status a journey shows once its published changes are applied. Only the status rules are here, so the
// board can use them without the stops. A cancellation wins over a termination. A null base stays null.
export function appliedStatus(base: JourneyStatus | null, changes: readonly PublishedChange[]): JourneyStatus | null {
  const live = liveChanges(changes)

  if (live.some((change) => change.type === 'cancellation')) {
    return 'cancelled'
  }
  if (live.some((change) => change.type === 'termination')) {
    return 'terminated'
  }
  return base
}

// Applies the published changes to a journey's timetable, as a pure function, so the rules are unit tested.
//
// Rules:
// - A change with correctedByChangeId set is ignored: the original stays on record, but it has no effect.
// - A correction contributes nothing; it only marks the change it corrects.
// - Delay: a delay from stop N moves every stop from N onward by its minutes. Delays are not added together,
//   because each one states the lateness from its stop onward. The latest delay (by publish time) that covers a
//   stop wins for that stop, so a later delay from stop 4 with 5 minutes overrides an earlier 15 minutes for
//   stop 4 onward, and an earlier delay from stop 2 still holds for stop 2 and 3.
// - Termination: the stops after lastStopSequence are not served. They keep their scheduled times, with no
//   expected times. The stops up to and including lastStopSequence keep the delays that apply to them.
// - Cancellation: no stop is served and no expected time is shown.
// - Platform change: the latest platform change for a stop (by publish time) sets its platform, and
//   platformChangedAt is that change's publish time.
export function applyChanges(journey: JourneyDetail, changes: readonly PublishedChange[]): JourneyLiveView {
  const live = liveChanges(changes)
  const status = appliedStatus(journey.status, changes)

  const delays = live.filter((change) => change.type === 'delay')
  const platformChanges = live.filter((change) => change.type === 'platform_change')
  const cutOff = lastServedStop(live)
  const isCancelled = status === 'cancelled'

  const stops = [...journey.stops]
    .sort((a, b) => a.sequence - b.sequence)
    .map((stop): StopLiveRow => {
      const isServed = !isCancelled && (cutOff === null || stop.sequence <= cutOff)
      const minutes = isServed ? delayMinutesFor(stop.sequence, delays) : null
      const platform = latestPlatformChange(stop.sequence, platformChanges)

      return {
        ...stop,
        platformId: platform?.platformId ?? stop.platformId,
        platformChangedAt: platform?.publishedAt ?? null,
        isServed,
        expectedArrival: shiftIfDelayed(stop.scheduledArrival, minutes),
        expectedDeparture: shiftIfDelayed(stop.scheduledDeparture, minutes),
      }
    })

  return { status, stops }
}

// The changes that count: not corrected, not a correction, and in publish-time order (oldest first), so the
// last match in the list is the latest one. Array.prototype.sort is stable, so equal times keep their order.
function liveChanges(changes: readonly PublishedChange[]): PublishedChange[] {
  return changes
    .filter((change) => change.correctedByChangeId === null && change.type !== 'correction')
    .sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))
}

// The last calling stop of the latest uncorrected termination, or null when the journey has none.
function lastServedStop(live: readonly PublishedChange[]): number | null {
  let cutOff: number | null = null
  for (const change of live) {
    if (change.type !== 'termination') {
      continue
    }
    const sequence = numberValue(change, 'lastStopSequence')
    if (sequence !== null) {
      cutOff = sequence
    }
  }
  return cutOff
}

function delayMinutesFor(sequence: number, delays: readonly PublishedChange[]): number | null {
  let minutes: number | null = null
  for (const delay of delays) {
    const fromSequence = numberValue(delay, 'fromSequence')
    const delayMinutes = numberValue(delay, 'minutes')
    if (fromSequence !== null && delayMinutes !== null && fromSequence <= sequence) {
      minutes = delayMinutes
    }
  }
  return minutes
}

function latestPlatformChange(
  sequence: number,
  platformChanges: readonly PublishedChange[],
): { platformId: string; publishedAt: string } | null {
  let latest: { platformId: string; publishedAt: string } | null = null
  for (const change of platformChanges) {
    const changedSequence = numberValue(change, 'sequence')
    const platformId = stringValue(change, 'platformId')
    if (changedSequence === sequence && platformId !== null) {
      latest = { platformId, publishedAt: change.publishedAt }
    }
  }
  return latest
}

// null when there is no time to move, or no delay applies.
function shiftIfDelayed(instant: string | null, minutes: number | null): string | null {
  if (instant === null || minutes === null) {
    return null
  }
  return new Date(Date.parse(instant) + minutes * MS_PER_MINUTE).toISOString()
}

// The values are typed string | number, and the API may send either, so both are read and checked here.
function numberValue(change: PublishedChange, key: string): number | null {
  const value = change.values[key]
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim())
  }
  return null
}

function stringValue(change: PublishedChange, key: string): string | null {
  const value = change.values[key]
  return typeof value === 'string' && value.trim() !== '' ? value : null
}
