import type { JourneyStop } from '@/features/journeys/types'
import type { Station } from '@/features/stations/types'
import type { PublishedChange } from '../types'

// One label/value row of the correction drawer's "Published" column. Values are the change's own published
// values, resolved to the names the journey already carries. Nothing here is recalculated.
export type PublishedValueRow = {
  label: string
  value: string
}

// The stop labels a published change names only by sequence. The journey's own stops supply the names, so the
// correction drawer needs no second reference-data request.
export function stopLabelsOf(stops: readonly JourneyStop[]): Map<number, string> {
  const labels = new Map<number, string>()

  for (const stop of stops) {
    labels.set(stop.sequence, `Stop ${stop.sequence}: ${stop.stationName ?? 'Unknown station'}`)
  }

  return labels
}

// Platform numbers for every platform in the reference data, keyed by id. A published platform change names
// the new platform only by id, and it may not appear on any of the journey's current stops, so the station
// list fills the gaps the stop rows leave.
export function platformNumbersOfStations(stations: readonly Station[]): Map<string, string> {
  const numbers = new Map<string, string>()

  for (const station of stations) {
    for (const platform of station.platforms) {
      numbers.set(platform.id, platform.number)
    }
  }

  return numbers
}

// What was published, in the change's own terms. A value the API did not send is shown as a dash so a gap is
// visible rather than silently blank.
export function publishedValueRows(
  change: PublishedChange,
  stopLabels: ReadonlyMap<number, string>,
  platformNumbers: ReadonlyMap<string, string>,
): PublishedValueRow[] {
  switch (change.type) {
    case 'delay':
      return [
        { label: 'Starts at', value: stopLabelOf(change.values.fromStopSequence, stopLabels) },
        { label: 'Delay', value: `${valueOf(change, 'minutes')} min` },
      ]
    case 'platform_change':
      return [
        { label: 'Stop', value: stopLabelOf(change.values.stopSequence, stopLabels) },
        {
          label: 'Platform',
          value: platformNumbers.get(valueOf(change, 'platformId')) ?? valueOf(change, 'platformId'),
        },
      ]
    case 'termination':
      return [
        { label: 'Last stop served', value: stopLabelOf(change.values.lastStopSequence, stopLabels) },
      ]
    case 'cancellation':
      return [{ label: 'Journey', value: 'Cancelled' }]
    case 'correction':
      return [{ label: 'Withdraws', value: valueOf(change, 'correctsChangeId') }]
  }
}

function stopLabelOf(sequence: string | undefined, stopLabels: ReadonlyMap<number, string>): string {
  if (sequence === undefined) {
    return '—'
  }

  const parsed = Number(sequence)
  return stopLabels.get(parsed) ?? `Stop ${sequence}`
}

function valueOf(change: PublishedChange, key: string): string {
  return change.values[key] ?? '—'
}
